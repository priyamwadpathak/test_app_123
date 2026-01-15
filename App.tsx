
import React, { useState, useEffect, useCallback } from 'react';
import MarketHeader from './components/MarketHeader';
import TradingChart from './components/TradingChart';
import OptionChain from './components/OptionChain';
import AnalysisPanel from './components/AnalysisPanel';
import { MarketIndex, MarketState, Candlestick, OptionData, TradeSignal, GroundingSource } from './types';
import { calculateRSI } from './utils/indicators';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  const [activeMarket, setActiveMarket] = useState<MarketIndex>(MarketIndex.NIFTY_50);
  const [marketHistory, setMarketHistory] = useState<Record<MarketIndex, Candlestick[]>>({
    [MarketIndex.NIFTY_50]: [],
    [MarketIndex.SENSEX]: []
  });
  const [optionChains, setOptionChains] = useState<Record<MarketIndex, OptionData[]>>({
    [MarketIndex.NIFTY_50]: [],
    [MarketIndex.SENSEX]: []
  });
  const [marketStats, setMarketStats] = useState<Record<MarketIndex, { price: number, change: number, changePercent: number }>>({
    [MarketIndex.NIFTY_50]: { price: 22400, change: 0, changePercent: 0 },
    [MarketIndex.SENSEX]: { price: 73800, change: 0, changePercent: 0 }
  });
  const [signals, setSignals] = useState<Record<MarketIndex, TradeSignal | null>>({
    [MarketIndex.NIFTY_50]: null,
    [MarketIndex.SENSEX]: null
  });
  const [sources, setSources] = useState<Record<MarketIndex, GroundingSource[]>>({
    [MarketIndex.NIFTY_50]: [],
    [MarketIndex.SENSEX]: []
  });
  const [fetching, setFetching] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchLatestData = useCallback(async (market: MarketIndex) => {
    setFetching(true);
    try {
      const data = await geminiService.fetchMarketData(market);
      setMarketHistory(prev => ({ ...prev, [market]: data.history }));
      setOptionChains(prev => ({ ...prev, [market]: data.options }));
      setMarketStats(prev => ({ 
        ...prev, 
        [market]: { price: data.price, change: data.change, changePercent: data.changePercent } 
      }));
      setSources(prev => ({ ...prev, [market]: data.sources }));
      
      // Auto-trigger analysis once data is in
      runAnalysis(market, data.price, data.history, data.options);
    } catch (err) {
      console.error("Fetch latest data error:", err);
    } finally {
      setFetching(false);
    }
  }, []);

  const runAnalysis = async (market: MarketIndex, price: number, history: Candlestick[], options: OptionData[]) => {
    setAnalyzing(true);
    try {
      const rsi = calculateRSI(history);
      const signal = await geminiService.analyzeMarket(market, price, rsi, history, options);
      setSignals(prev => ({ ...prev, [market]: signal }));
    } catch (err) {
      console.error("Analysis error:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const manualAnalyze = () => {
    const history = marketHistory[activeMarket];
    const options = optionChains[activeMarket];
    const stats = marketStats[activeMarket];
    if (history.length > 0) {
      runAnalysis(activeMarket, stats.price, history, options);
    }
  };

  useEffect(() => {
    fetchLatestData(activeMarket);
  }, [activeMarket, fetchLatestData]);

  const currentHistory = marketHistory[activeMarket];
  const currentPrice = marketStats[activeMarket].price;
  const currentRSI = calculateRSI(currentHistory);
  const currentSources = sources[activeMarket];

  const marketSummary: Record<MarketIndex, MarketState> = {
    [MarketIndex.NIFTY_50]: {
      index: MarketIndex.NIFTY_50,
      price: marketStats[MarketIndex.NIFTY_50].price,
      change: marketStats[MarketIndex.NIFTY_50].change,
      changePercent: marketStats[MarketIndex.NIFTY_50].changePercent,
      rsi: calculateRSI(marketHistory[MarketIndex.NIFTY_50]),
      trend: marketStats[MarketIndex.NIFTY_50].change >= 0 ? 'Up' : 'Down'
    },
    [MarketIndex.SENSEX]: {
      index: MarketIndex.SENSEX,
      price: marketStats[MarketIndex.SENSEX].price,
      change: marketStats[MarketIndex.SENSEX].change,
      changePercent: marketStats[MarketIndex.SENSEX].changePercent,
      rsi: calculateRSI(marketHistory[MarketIndex.SENSEX]),
      trend: marketStats[MarketIndex.SENSEX].change >= 0 ? 'Up' : 'Down'
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {fetching && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-[#1a1c21] p-8 rounded-2xl border border-blue-600/30 shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl font-bold text-white mb-2">Fetching Live Terminal Data</h2>
            <p className="text-gray-500 text-sm">Querying NSE/BSE weekly option chains via Google Search...</p>
          </div>
        </div>
      )}

      <MarketHeader 
        markets={marketSummary} 
        activeMarket={activeMarket} 
        setActiveMarket={setActiveMarket} 
      />

      <main className="flex-grow p-4 md:p-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          
          {/* Left Column: Charts & Analysis */}
          <div className="lg:col-span-8 flex flex-col space-y-6">
            <TradingChart 
              data={currentHistory} 
              rsi={currentRSI} 
            />
            
            <div className="grid grid-cols-1 gap-6">
               <AnalysisPanel 
                signal={signals[activeMarket]} 
                loading={analyzing}
                onRefresh={manualAnalyze}
              />
            </div>

            {/* Citations / Sources */}
            {currentSources.length > 0 && (
              <div className="bg-[#121417] border border-[#2d2f36] rounded-xl p-4">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-3 tracking-widest">Grounding Sources (Search Results)</h4>
                <div className="flex flex-wrap gap-2">
                  {currentSources.map((source, idx) => (
                    <a 
                      key={idx}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] bg-blue-600/10 text-blue-400 border border-blue-600/20 px-2 py-1 rounded hover:bg-blue-600/20 transition-colors"
                    >
                      {source.title.length > 25 ? source.title.substring(0, 25) + '...' : source.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Option Chain */}
          <div className="lg:col-span-4 h-[600px] lg:h-auto">
            <OptionChain 
              options={optionChains[activeMarket]} 
              spotPrice={currentPrice} 
            />
          </div>

        </div>

        {/* Trade Execution Logic Footer */}
        <div className="mt-8 bg-[#121417] border border-[#2d2f36] p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase">System Integrity</span>
              <span className="flex items-center text-xs font-bold text-blue-500">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                LIVE SEARCH ENABLED
              </span>
            </div>
            <button 
              onClick={() => fetchLatestData(activeMarket)}
              className="ml-4 px-3 py-1 border border-[#2d2f36] rounded text-[10px] text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              REFRESH DATA
            </button>
          </div>
          <div className="flex items-center space-x-3">
             <button className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-sm shadow-lg shadow-green-900/20 active:scale-95 transition-all">
                BUY CALL
             </button>
             <button className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-900/20 active:scale-95 transition-all">
                BUY PUT
             </button>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-gray-600 text-[10px] uppercase tracking-widest border-t border-[#1a1c21]">
        Developed for Quant Research Purposes • Powered by Gemini AI Studio • Live Data via Google Search
      </footer>
    </div>
  );
};

export default App;
