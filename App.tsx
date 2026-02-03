
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
  const [lastUpdated, setLastUpdated] = useState<string>('Syncing...');
  
  const lastAnalyzedPrice = useRef<Record<MarketIndex, number>>({
    [MarketIndex.NIFTY_50]: 0,
    [MarketIndex.SENSEX]: 0
  });
  const lastAnalyzedRSI = useRef<Record<MarketIndex, number>>({
    [MarketIndex.NIFTY_50]: 0,
    [MarketIndex.SENSEX]: 0
  });

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
  const [error, setError] = useState<{ message: string; type: 'rate' | 'network' } | null>(null);

  const runAnalysis = useCallback(async (market: MarketIndex, price: number, history: Candlestick[], options: OptionData[], force = false) => {
    if (history.length === 0) return;

    const currentRSI = calculateRSI(history);
    const priceDiff = Math.abs(price - lastAnalyzedPrice.current[market]) / price;
    const rsiDiff = Math.abs(currentRSI - lastAnalyzedRSI.current[market]);
    
    // Decoupled Logic: Only re-analyze on significant trend shifts
    const shouldAnalyze = force || !signals[market] || priceDiff > 0.003 || rsiDiff > 6;

    if (!shouldAnalyze) {
      return;
    }

    setAnalyzing(true);
    try {
      const signal = await geminiService.analyzeMarket(market, price, currentRSI, history, options);
      setSignals(prev => ({ ...prev, [market]: signal }));
      lastAnalyzedPrice.current[market] = price;
      lastAnalyzedRSI.current[market] = currentRSI;
    } catch (err: any) {
      console.error("Analysis error:", err);
    } finally {
      setAnalyzing(false);
    }
  }, [signals]);

  const fetchLatestData = useCallback(async (market: MarketIndex) => {
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
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
      
      runAnalysis(market, data.price, data.history, data.options);
    } catch (err: any) {
      console.error("Fetch latest data error:", err);
      if (err?.message?.includes('429')) {
        setError({ message: "Quota Exhausted. Slowing sync...", type: 'rate' });
      } else {
        setError({ message: "Tape Lag. Still monitoring...", type: 'network' });
      }
    } finally {
      setFetching(false);
    }
  }, [runAnalysis]);

  useEffect(() => {
    fetchLatestData(activeMarket);
    // Increased interval to 60s to respect rate limits while maintaining freshness
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
      <div className={`fixed top-0 left-0 w-full h-[2px] z-[60] transition-opacity duration-500 ${fetching ? 'opacity-100' : 'opacity-0'}`}>
        <div className="h-full bg-blue-500 animate-[loading_2s_linear_infinite]" style={{ width: '30%' }}></div>
      </div>

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

        <div className="flex items-center justify-between mb-4 px-2">
           <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-1.5 h-1.5 rounded-full ${fetching ? 'bg-blue-400' : error?.type === 'rate' ? 'bg-orange-500' : 'bg-green-500 shadow-[0_0_8px_#22c55e]'}`}></div>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
                  {fetching ? 'FETCHING' : error?.type === 'rate' ? 'RATE_LIMIT_MODE' : 'FEED_ACTIVE'}
                </span>
              </div>
              <span className="text-gray-800 text-[10px]">|</span>
              <span className="text-[10px] font-bold text-blue-500/80 uppercase tracking-widest mono">TICK: {lastUpdated}</span>
           </div>
           
           {error && (
             <div className={`flex items-center space-x-3 px-3 py-1 rounded-full border ${error.type === 'rate' ? 'bg-orange-500/10 border-orange-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
               <span className={`text-[9px] font-bold uppercase ${error.type === 'rate' ? 'text-orange-400' : 'text-red-400'}`}>{error.message}</span>
               {error.type === 'network' && (
                 <button onClick={() => fetchLatestData(activeMarket)} className="text-[9px] font-black text-white underline uppercase">Retry</button>
               )}
             </div>
           )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full">
          <div className="lg:col-span-8 space-y-5">
            <TradingChart 
              data={currentHistory.length > 0 ? currentHistory : [{ time: '09:15', open: currentPrice, high: currentPrice, low: currentPrice, close: currentPrice, volume: 0 }]} 
              rsi={currentRSI} 
            />
            
            <AnalysisPanel 
              signal={signals[activeMarket]} 
              loading={analyzing}
              onRefresh={() => runAnalysis(activeMarket, currentPrice, currentHistory, optionChains[activeMarket], true)}
            />

            {currentSources.length > 0 && (
              <div className="bg-[#121417]/30 border border-white/[0.02] rounded-2xl p-4">
                <h4 className="text-[8px] font-black text-gray-700 uppercase mb-3 tracking-[0.3em] flex items-center">
                  <svg className="w-2.5 h-2.5 mr-2 text-blue-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Sources
                </h4>
                <div className="flex flex-wrap gap-2">
                  {currentSources.map((source, idx) => (
                    <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="text-[8px] bg-white/[0.01] text-gray-500 border border-white/[0.03] px-2 py-1 rounded hover:border-blue-400/30 hover:text-blue-400 transition-all font-bold">
                      {source.title.split(' - ')[0]}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 lg:h-[calc(100vh-160px)] sticky top-20">
            <OptionChain 
              options={optionChains[activeMarket]} 
              spotPrice={currentPrice} 
              loading={fetching && optionChains[activeMarket].length === 0}
            />
          </div>
        </div>

        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-2xl bg-[#1a1c21]/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-4 shadow-2xl z-50 flex items-center justify-between">
           <div className="pl-6 hidden md:flex flex-col">
              <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em]">Institutional</span>
              <span className="text-sm font-black text-white italic tracking-tighter">QUANT_TERMINAL v5.2</span>
           </div>
           <div className="flex items-center space-x-3 w-full md:w-auto">
              <button className="flex-1 md:flex-none px-10 py-4 bg-green-600/90 hover:bg-green-500 text-white font-black rounded-3xl shadow-xl active:scale-95 transition-all text-[11px] uppercase tracking-wider">
                BUY CE
              </button>
              <button className="flex-1 md:flex-none px-10 py-4 bg-red-600/90 hover:bg-red-500 text-white font-black rounded-3xl shadow-xl active:scale-95 transition-all text-[11px] uppercase tracking-wider">
                BUY PE
              </button>
           </div>
        </div>
      </main>

      <div className="h-28"></div>
    </div>
  );
};

export default App;
