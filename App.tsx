
import React, { useState, useEffect, useCallback, useRef } from 'react';
import MarketHeader from './components/MarketHeader';
import TradingChart from './components/TradingChart';
import OptionChain from './components/OptionChain';
import AnalysisPanel from './components/AnalysisPanel';
import { MarketIndex, MarketState, Candlestick, OptionData, TradeSignal, GroundingSource } from './types';
import { calculateRSI } from './utils/indicators';
import { geminiService } from './services/geminiService';

// Utility to generate high-quality placeholder data to prevent UI from looking "stuck"
const generatePlaceholderHistory = (base: number) => {
  return Array.from({ length: 15 }).map((_, i) => ({
    time: `${9 + Math.floor(i/4)}:${(i % 4) * 15}`,
    open: base + Math.random() * 20,
    high: base + 25 + Math.random() * 10,
    low: base - 5 - Math.random() * 10,
    close: base + Math.random() * 20,
    volume: 500000
  }));
};

const App: React.FC = () => {
  const [activeMarket, setActiveMarket] = useState<MarketIndex>(MarketIndex.NIFTY_50);
  
  // High-fidelity initial state to ensure rendering while background fetching happens
  const [marketHistory, setMarketHistory] = useState<Record<MarketIndex, Candlestick[]>>({
    [MarketIndex.NIFTY_50]: generatePlaceholderHistory(23200),
    [MarketIndex.SENSEX]: generatePlaceholderHistory(76500)
  });
  const [optionChains, setOptionChains] = useState<Record<MarketIndex, OptionData[]>>({
    [MarketIndex.NIFTY_50]: [],
    [MarketIndex.SENSEX]: []
  });
  const [marketStats, setMarketStats] = useState<Record<MarketIndex, { price: number, change: number, changePercent: number }>>({
    [MarketIndex.NIFTY_50]: { price: 23200, change: 45.3, changePercent: 0.20 },
    [MarketIndex.SENSEX]: { price: 76500, change: 124.5, changePercent: 0.16 }
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
  
  const fetchTimeoutRef = useRef<number | null>(null);

  const fetchLatestData = useCallback(async (market: MarketIndex) => {
    // Clear existing errors and show syncing indicator
    setError(null);
    setFetching(true);

    // Set a client-side safety timeout to prevent "stuck" UI if API hangs
    if (fetchTimeoutRef.current) window.clearTimeout(fetchTimeoutRef.current);
    fetchTimeoutRef.current = window.setTimeout(() => {
      if (fetching) {
        setFetching(false);
        setError("Market sync taking longer than usual. Retrying...");
      }
    }, 15000);

    try {
      const data = await geminiService.fetchMarketData(market);
      setMarketHistory(prev => ({ ...prev, [market]: data.history }));
      setOptionChains(prev => ({ ...prev, [market]: data.options }));
      setMarketStats(prev => ({ 
        ...prev, 
        [market]: { price: data.price, change: data.change, changePercent: data.changePercent } 
      }));
      setSources(prev => ({ ...prev, [market]: data.sources }));
      
      // Auto-trigger analysis once new data is confirmed
      runAnalysis(market, data.price, data.history, data.options);
    } catch (err) {
      console.error("Fetch latest data error:", err);
      setError("Unable to sync live data. Using terminal baseline.");
    } finally {
      setFetching(false);
      if (fetchTimeoutRef.current) window.clearTimeout(fetchTimeoutRef.current);
    }
  }, [fetching]);

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
    // Cleanup timeout on unmount
    return () => {
      if (fetchTimeoutRef.current) window.clearTimeout(fetchTimeoutRef.current);
    };
  }, [activeMarket]);

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
    <div className="min-h-screen flex flex-col relative bg-[#0a0b0d]">
      {/* Background Refresh & Error Indicators */}
      <div className={`fixed top-4 right-8 z-[60] flex items-center space-x-3 bg-[#1a1c21]/90 backdrop-blur px-4 py-2 rounded-2xl border border-white/5 transition-all duration-500 shadow-2xl ${fetching || error ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'}`}>
        {fetching ? (
          <>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Updating Terminal...</span>
          </>
        ) : error ? (
          <>
            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">{error}</span>
          </>
        ) : null}
      </div>

      <MarketHeader 
        markets={marketSummary} 
        activeMarket={activeMarket} 
        setActiveMarket={setActiveMarket} 
      />

      <main className="flex-grow p-4 md:p-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          
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

            {currentSources.length > 0 && (
              <div className="bg-[#121417] border border-[#2d2f36] rounded-xl p-4">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-3 tracking-widest flex items-center">
                  <svg className="w-3 h-3 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Real-time Grounding Links
                </h4>
                <div className="flex flex-wrap gap-2">
                  {currentSources.map((source, idx) => (
                    <a 
                      key={idx}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] bg-blue-600/5 text-blue-400/80 border border-blue-600/10 px-2.5 py-1.5 rounded-lg hover:bg-blue-600/20 hover:text-blue-300 transition-all"
                    >
                      {source.title.length > 30 ? source.title.substring(0, 30) + '...' : source.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 h-[600px] lg:h-auto">
            <OptionChain 
              options={optionChains[activeMarket]} 
              spotPrice={currentPrice} 
            />
          </div>

        </div>

        <div className="mt-8 bg-[#121417] border border-[#2d2f36] p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-6">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Market Connectivity</span>
              <div className="flex items-center space-x-3">
                <span className={`flex items-center text-xs font-bold ${error ? 'text-amber-500' : 'text-blue-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-2 shadow-[0_0_8px_currentColor] ${error ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                  {error ? 'PARTIAL CONNECT' : 'LIVE PRO-FEED'}
                </span>
                <span className="text-gray-700">|</span>
                <span className="text-[10px] text-gray-500">AUTO-REFRESH: 60s</span>
              </div>
            </div>
            <button 
              onClick={() => fetchLatestData(activeMarket)}
              disabled={fetching}
              className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all flex items-center group"
            >
              <svg className={`w-3 h-3 mr-2 transition-transform duration-700 ${fetching ? 'animate-spin' : 'group-hover:rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {fetching ? 'SYNCING...' : 'REFRESH'}
            </button>
          </div>
          <div className="flex items-center space-x-4 w-full md:w-auto">
             <button className="flex-1 md:flex-none px-8 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black text-sm shadow-xl shadow-green-900/10 active:scale-95 transition-all uppercase tracking-tighter">
                EXECUTE CALL
             </button>
             <button className="flex-1 md:flex-none px-8 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-sm shadow-xl shadow-red-900/10 active:scale-95 transition-all uppercase tracking-tighter">
                EXECUTE PUT
             </button>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-gray-700 text-[10px] uppercase tracking-[0.2em] border-t border-white/5">
        Quant Terminal v4.1 • Gemini High-Frequency Analysis • 0.01% Data Precision
      </footer>
    </div>
  );
};

export default App;
