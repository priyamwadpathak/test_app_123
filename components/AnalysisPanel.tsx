
import React from 'react';
import { TradeSignal } from '../types';

interface AnalysisPanelProps {
  signal: TradeSignal | null;
  loading: boolean;
  onRefresh: () => void;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ signal, loading, onRefresh }) => {
  return (
    <div className="bg-[#121417] border border-[#2d2f36] rounded-2xl p-6 h-full flex flex-col relative overflow-hidden transition-all duration-500 shadow-xl">
      <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/5 blur-[80px] rounded-full -mr-24 -mt-24 pointer-events-none"></div>
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div>
          <h3 className="text-base font-black text-white mb-0.5 tracking-tight flex items-center">
            AI Quant Insight
            {signal && !loading && (
              <span className="ml-3 px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase tracking-[0.2em] rounded border border-blue-500/20">
                Monitoring Live
              </span>
            )}
          </h3>
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Calculated on Cluster v5</p>
        </div>
        <button 
          onClick={onRefresh}
          disabled={loading}
          className={`px-5 py-2.5 rounded-xl font-black text-[10px] transition-all uppercase tracking-widest ${
            loading 
            ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
            : 'bg-white/5 hover:bg-white/10 text-white border border-white/10 active:scale-95'
          }`}
        >
          {loading ? 'Analyzing...' : 'Manual Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="flex-grow flex flex-col items-center justify-center space-y-5 py-12">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-blue-600/10 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-ping"></div>
            </div>
          </div>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.3em] animate-pulse">Running Monte Carlo Simulations...</p>
        </div>
      ) : signal ? (
        <div className="flex-grow flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className={`mb-6 p-5 rounded-2xl border flex items-center justify-between transition-colors ${
            signal.direction === 'BULLISH' 
            ? 'bg-green-500/[0.03] border-green-500/20' 
            : signal.direction === 'BEARISH' 
            ? 'bg-red-500/[0.03] border-red-500/20' 
            : 'bg-gray-500/[0.03] border-gray-500/20'
          }`}>
            <div>
              <span className={`text-[9px] font-black uppercase tracking-widest block mb-2 ${
                signal.direction === 'BULLISH' ? 'text-green-500' : 'text-red-500'
              }`}>
                {signal.direction} Opportunity Detected
              </span>
              <p className="text-2xl font-black text-white tracking-tight">{signal.recommendedOption}</p>
            </div>
            <div className="text-right">
               <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Conviction</span>
               <span className="text-xl font-black text-white">{signal.confidence}%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#1a1c21]/50 p-4 rounded-xl border border-white/[0.03]">
              <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-2">Entry Window</p>
              <p className="text-lg font-black mono text-blue-400 tracking-tighter">₹{signal.optionEntry.toFixed(1)}</p>
              <p className="text-[10px] text-gray-600 mono mt-0.5">Idx: {signal.entry.toFixed(0)}</p>
            </div>
            <div className="bg-[#1a1c21]/50 p-4 rounded-xl border border-white/[0.03]">
              <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-2">Primary Target</p>
              <p className="text-lg font-black mono text-green-400 tracking-tighter">₹{signal.optionTarget.toFixed(1)}</p>
              <p className="text-[10px] text-gray-600 mono mt-0.5">Idx: {signal.target.toFixed(0)}</p>
            </div>
            <div className="bg-[#1a1c21]/50 p-4 rounded-xl border border-white/[0.03]">
              <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-2">Stop Loss</p>
              <p className="text-lg font-black mono text-red-400 tracking-tighter">₹{signal.optionStopLoss.toFixed(1)}</p>
              <p className="text-[10px] text-gray-600 mono mt-0.5">Idx: {signal.stopLoss.toFixed(0)}</p>
            </div>
          </div>

          <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/[0.03] mb-6 flex-grow">
            <h4 className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-3">Strategy Rationale</h4>
            <p className="text-[13px] leading-relaxed text-gray-300 font-medium italic">
              "{signal.rationale}"
            </p>
          </div>

          <div className="flex items-center justify-between text-[9px] font-bold text-gray-700 uppercase tracking-[0.2em]">
            <span>Algorithm Hash: 0x82...3f1</span>
            <div className="flex items-center space-x-2">
               <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
               <span>Signal Active</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center py-20 bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
          <p className="text-gray-600 text-[11px] font-black uppercase tracking-[0.2em] mb-4">Scanning Market Context...</p>
          <p className="text-[10px] text-gray-700 max-w-[200px] text-center">Identifying high-conviction trend alignment for options execution.</p>
        </div>
      )}
    </div>
  );
};

export default AnalysisPanel;
