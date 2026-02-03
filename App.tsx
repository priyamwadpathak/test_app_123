
import React, { useState, useEffect, useCallback, useRef } from 'react';
import MarketHeader from './components/MarketHeader';
import TradingChart from './components/TradingChart';
import OptionChain from './components/OptionChain';
import AnalysisPanel from './components/AnalysisPanel';
import { MarketIndex, MarketState, Candlestick, OptionData, TradeSignal, GroundingSource } from './types';
import { calculateRSI } from './utils/indicators';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  const [activeMarket, setActiveMarket] = useState<MarketIndex>(MarketIndex.NIFTY_50);
  const [lastUpdated, setLastUpdated] = useState<string>('Not Synced');
  
  const [marketHistory, setMarketHistory] = useState<Record<MarketIndex, Candlestick[]>>({
    [MarketIndex.NIFTY_50]: [],
    [MarketIndex.SENSEX]: []
  });
  const [optionChains, setOptionChains] = useState<Record<MarketIndex, OptionData[]>>({
    [MarketIndex.NIFTY_50]: [],
    [MarketIndex.SENSEX]: []
  });
  const [marketStats, setMarketStats] = useState<Record<MarketIndex, { price: number, change: number, changePercent: number }>>({
    [MarketIndex.NIFTY_50]: { price: 23200, change: 0, changePercent: 0 },
    [MarketIndex.SENSEX]: { price: 76500, change: 0, changePercent: 0 }
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
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(async (market: MarketIndex, price: number, history: Candlestick[], options: OptionData[]) => {
    if (history.length === 0) return;
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
  }, []);

  const fetchLatestData = useCallback(async (market: MarketIndex) => {
    // Prevent overlapping fetches for the same market
    setFetching(true);
    setError(null);
    try {
      const data = await geminiService.fetchMarketData(market);
      setMarketHistory(prev => ({ ...prev, [market]: data.history }));
      setOptionChains(prev => ({ ...prev, [market]: data.options }));
      setMarketStats(prev => ({ 
        ...prev, 
        [market]: { price: data.price, change: data.change, changePercent: data.changePercent } 
      }));
      setSources(prev => ({ ...prev, [market]: data.sources }));
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      
      // Trigger analysis immediately after data update
      runAnalysis(market, data.price, data.history, data.options);
    } catch (err) {
      console.error("Fetch latest data error:", err);
      setError("Network lag. Still monitoring...");
    } finally {
      setFetching(false);
    }
  }, [runAnalysis]);

  useEffect(() => {
    fetchLatestData(activeMarket);
    // Faster refresh for "Real-time" feel - every 60 seconds
    const interval = setInterval(() => fetchLatestData(activeMarket), 60000); 
    return () => clearInterval(interval);
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
    <div className="min-h-screen flex flex-col relative bg-[#0a0b0d] text-gray-200 overflow-hidden">
      {/* Global Sync Overlay Indicator */}
      {fetching && (
        <div className="fixed top-0 left-0 w-full h-1 bg-blue-600/20 z-[60]">
          <div className="h-full bg-blue-500 animate-[loading_2s_ease-in-out_infinite]" style={{ width: '30%' }}></div>
        </div>
      )}

      <MarketHeader 
        markets={marketSummary} 
        activeMarket={activeMarket} 
        setActiveMarket={setActiveMarket} 
      />

      <main className="flex-grow p-4 lg:p-6 max-w-[1600px] mx-auto w-full relative">
        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(400%); }
          }
        `}</style>

        {/* Status Strip */}
        <div className="flex items-center justify-between mb-4 px-2">
           <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-1.5 h-1.5 rounded-full ${fetching ? 'bg-blue-400 animate-pulse' : 'bg-green-500 shadow-[0_0_8px_#22c55e]'}`}></div>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">
                  {fetching ? 'Syncing...' : 'Stable'}
                </span>
              </div>
              <span className="text-gray-800 text-[10px]">|</span>
              <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Feed: {lastUpdated}</span>
           </div>
           
           {error && (
             <div className="flex items-center space-x-3 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 animate-bounce">
               <span className="text-[9px] font-bold text-red-400 uppercase tracking-tighter">{error}</span>
               <button onClick={() => fetchLatestData(activeMarket)} className="text-[9px] font-black text-white hover:underline uppercase">Retry</button>
             </div>
           )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full">
          {/* Main Visualizer */}
          <div className="lg:col-span-8 space-y-5">
            <TradingChart 
              data={currentHistory.length > 0 ? currentHistory : [{ time: '09:15', open: currentPrice, high: currentPrice, low: currentPrice, close: currentPrice, volume: 0 }]} 
              rsi={currentRSI} 
            />
            
            <AnalysisPanel 
              signal={signals[activeMarket]} 
              loading={analyzing}
              onRefresh={() => runAnalysis(activeMarket, currentPrice, currentHistory, optionChains[activeMarket])}
            />

            {currentSources.length > 0 && (
              <div className="bg-[#121417]/30 border border-white/[0.02] rounded-2xl p-4">
                <h4 className="text-[8px] font-black text-gray-700 uppercase mb-3 tracking-[0.3em] flex items-center">
                  <svg className="w-2.5 h-2.5 mr-2 text-blue-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Verified Sources
                </h4>
                <div className="flex flex-wrap gap-2">
                  {currentSources.map((source, idx) => (
                    <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="text-[8px] bg-white/[0.01] text-gray-500 border border-white/[0.03] px-2 py-1 rounded hover:border-blue-500/30 hover:text-blue-400 transition-all font-bold">
                      {source.title.split(' - ')[0]}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Option Chain (Sticky on Desktop) */}
          <div className="lg:col-span-4 lg:h-[calc(100vh-160px)] sticky top-20">
            <OptionChain 
              options={optionChains[activeMarket]} 
              spotPrice={currentPrice} 
              loading={fetching && optionChains[activeMarket].length === 0}
            />
          </div>
        </div>

        {/* Execution Dock - Quick Actions */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-[#1a1c21]/95 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-3 shadow-2xl z-50 flex items-center justify-between">
           <div className="pl-4 hidden md:flex flex-col">
              <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Institutional</span>
              <span className="text-xs font-black text-white italic">QUANT ENGINE</span>
           </div>
           <div className="flex items-center space-x-3 w-full md:w-auto">
              <button className="flex-1 md:flex-none px-8 py-4 bg-green-600/90 hover:bg-green-500 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all text-[11px] uppercase tracking-wider">
                BUY CALL
              </button>
              <button className="flex-1 md:flex-none px-8 py-4 bg-red-600/90 hover:bg-red-500 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all text-[11px] uppercase tracking-wider">
                BUY PUT
              </button>
           </div>
        </div>
      </main>

      <div className="h-24"></div>
    </div>
  );
};

export default App;
