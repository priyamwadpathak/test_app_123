
import React from 'react';
import { TradeSignal } from '../types';

interface AnalysisPanelProps {
  signal: TradeSignal | null;
  loading: boolean;
  onRefresh: () => void;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ signal, loading, onRefresh }) => {
  return (
    <div className="bg-[#121417] border border-[#2d2f36] rounded-xl p-6 h-full flex flex-col relative overflow-hidden">
      {/* Decorative backdrop */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none"></div>
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">AI Trade Signal</h3>
          <p className="text-xs text-gray-500 uppercase tracking-widest">Strategy: Price Action + RSI</p>
        </div>
        <button 
          onClick={onRefresh}
          disabled={loading}
          className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
            loading 
            ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 active:scale-95'
          }`}
        >
          {loading ? 'ANALYZING...' : 'RE-ANALYZE'}
        </button>
      </div>

      {loading ? (
        <div className="flex-grow flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500 animate-pulse">Consulting Gemini Quant Models...</p>
        </div>
      ) : signal ? (
        <div className="flex-grow flex flex-col">
          <div className={`mb-6 p-4 rounded-xl border ${
            signal.direction === 'BULLISH' 
            ? 'bg-green-500/5 border-green-500/20' 
            : signal.direction === 'BEARISH' 
            ? 'bg-red-500/5 border-red-500/20' 
            : 'bg-gray-500/5 border-gray-500/20'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Market Bias</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                signal.direction === 'BULLISH' ? 'bg-green-500 text-black' : 'bg-red-500 text-black'
              }`}>
                {signal.direction}
              </span>
            </div>
            <p className="text-2xl font-black italic tracking-tight text-white">{signal.recommendedOption}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#1a1c21] p-3 rounded-lg border border-[#2d2f36] flex flex-col">
              <p className="text-[10px] text-gray-500 uppercase mb-1 font-bold">Entry</p>
              <div className="flex flex-col">
                <p className="text-sm font-bold mono text-white">{signal.entry.toFixed(1)} <span className="text-[10px] text-gray-600 font-normal">Idx</span></p>
                <p className="text-lg font-black mono text-blue-400">₹{signal.optionEntry.toFixed(2)}</p>
              </div>
            </div>
            <div className="bg-[#1a1c21] p-3 rounded-lg border border-[#2d2f36] flex flex-col">
              <p className="text-[10px] text-gray-500 uppercase mb-1 font-bold">Target</p>
              <div className="flex flex-col">
                <p className="text-sm font-bold mono text-white">{signal.target.toFixed(1)} <span className="text-[10px] text-gray-600 font-normal">Idx</span></p>
                <p className="text-lg font-black mono text-green-400">₹{signal.optionTarget.toFixed(2)}</p>
              </div>
            </div>
            <div className="bg-[#1a1c21] p-3 rounded-lg border border-[#2d2f36] flex flex-col">
              <p className="text-[10px] text-gray-500 uppercase mb-1 font-bold">Stop Loss</p>
              <div className="flex flex-col">
                <p className="text-sm font-bold mono text-white">{signal.stopLoss.toFixed(1)} <span className="text-[10px] text-gray-600 font-normal">Idx</span></p>
                <p className="text-lg font-black mono text-red-400">₹{signal.optionStopLoss.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 p-4 rounded-xl flex-grow mb-4">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-2">Quant Rationale</h4>
            <p className="text-sm leading-relaxed text-gray-300 italic">"{signal.rationale}"</p>
          </div>

          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`w-3 h-1 rounded-full ${i < signal.confidence / 20 ? 'bg-blue-500' : 'bg-gray-800'}`}></div>
              ))}
              <span className="text-[10px] text-gray-500 ml-2">CONFIDENCE</span>
            </div>
            <span className="text-[10px] text-gray-600">v3.0-PRO</span>
          </div>
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-gray-600 italic">Click re-analyze to generate trade signals</p>
        </div>
      )}
    </div>
  );
};

export default AnalysisPanel;
