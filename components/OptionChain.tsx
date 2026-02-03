
import React from 'react';
import { OptionData, OptionType } from '../types';

interface OptionChainProps {
  options: OptionData[];
  spotPrice: number;
  loading?: boolean;
}

const OptionChain: React.FC<OptionChainProps> = ({ options, spotPrice, loading }) => {
  // Fix: Removed redundant string literal checks ('CE', 'PE') as they cause type narrowing conflicts with OptionType enum
  const calls = options.filter(o => o.type === OptionType.CALL);
  const puts = options.filter(o => o.type === OptionType.PUT);
  
  const strikes = Array.from(new Set(options.map(o => o.strike))).sort((a: number, b: number) => a - b);
  const expiryDate = options.length > 0 ? options[0].expiry : 'Syncing...';

  // Skeleton rows for loading state
  const skeletonRows = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="bg-[#111214] border border-[#2d2f36] rounded-2xl overflow-hidden flex flex-col h-full shadow-2xl transition-all duration-300">
      <div className="bg-[#1a1c21] px-5 py-4 border-b border-[#2d2f36] flex items-center justify-between">
        <div className="flex flex-col">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Option Chain</h3>
          <div className="flex items-center space-x-2">
             <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-blue-500 animate-ping' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'}`}></div>
             <span className="text-[11px] text-blue-400 font-bold mono">{expiryDate}</span>
          </div>
        </div>
        <div className="text-right">
           <span className="text-[9px] text-gray-600 font-bold block uppercase mb-1 tracking-widest">Live Spot</span>
           <span className="text-base font-black mono text-white">₹{Number(spotPrice).toLocaleString()}</span>
        </div>
      </div>

      <div className="overflow-auto flex-grow custom-scrollbar">
        <table className="w-full text-[11px] mono border-collapse">
          <thead className="sticky top-0 bg-[#111214] z-20 border-b border-[#2d2f36]">
            <tr className="text-[9px] text-gray-500 font-black uppercase tracking-wider">
              <th className="py-3 px-3 text-left">CE LTP</th>
              <th className="py-3 px-1 text-center bg-[#1a1c21]/50 w-24 border-x border-white/[0.03]">Strike</th>
              <th className="py-3 px-3 text-right">PE LTP</th>
            </tr>
          </thead>
          <tbody>
            {loading && strikes.length === 0 ? (
              skeletonRows.map((i) => (
                <tr key={i} className="border-b border-white/[0.02]">
                  <td className="py-4 px-3"><div className="h-4 w-12 bg-white/5 rounded animate-pulse"></div></td>
                  <td className="py-4 px-1 bg-[#1a1c21]/20"><div className="h-4 w-16 mx-auto bg-white/5 rounded animate-pulse"></div></td>
                  <td className="py-4 px-3 flex justify-end"><div className="h-4 w-12 bg-white/5 rounded animate-pulse"></div></td>
                </tr>
              ))
            ) : strikes.length > 0 ? (
              strikes.map((strike) => {
                const call = calls.find(c => Number(c.strike) === Number(strike));
                const put = puts.find(p => Number(p.strike) === Number(strike));
                const isATM = Math.abs(Number(strike) - Number(spotPrice)) < 50; 
                const isITM_Call = strike < spotPrice;
                const isITM_Put = strike > spotPrice;

                return (
                  <tr 
                    key={strike} 
                    className={`border-b border-white/[0.02] hover:bg-white/[0.03] transition-colors relative ${isATM ? 'bg-blue-500/[0.04]' : ''}`}
                  >
                    <td className={`py-4 px-3 font-bold ${isITM_Call ? 'bg-green-500/[0.04] text-green-400' : 'text-green-400/60'}`}>
                      {call?.ltp ? `₹${Number(call.ltp).toFixed(1)}` : '--'}
                    </td>
                    <td className={`py-4 px-1 text-center font-black ${isATM ? 'text-blue-400 scale-110 z-10 relative' : 'text-gray-400'} bg-[#1a1c21]/40 border-x border-white/[0.03]`}>
                      {strike}
                    </td>
                    <td className={`py-4 px-3 text-right font-bold ${isITM_Put ? 'bg-red-500/[0.04] text-red-400' : 'text-red-400/60'}`}>
                      {put?.ltp ? `₹${Number(put.ltp).toFixed(1)}` : '--'}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={3} className="py-24 text-center">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gray-700">Connecting to Tape...</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OptionChain;
