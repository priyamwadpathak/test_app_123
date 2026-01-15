
import React from 'react';
import { OptionData, OptionType } from '../types';

interface OptionChainProps {
  options: OptionData[];
  spotPrice: number;
}

const OptionChain: React.FC<OptionChainProps> = ({ options, spotPrice }) => {
  const calls = options.filter(o => o.type === OptionType.CALL);
  const puts = options.filter(o => o.type === OptionType.PUT);
  
  // Group by strike
  // Fix: Explicitly type 'a' and 'b' as numbers to resolve arithmetic operation type errors on potentially unknown types.
  const strikes = Array.from(new Set(options.map(o => o.strike))).sort((a: number, b: number) => a - b);

  return (
    <div className="bg-[#121417] border border-[#2d2f36] rounded-xl overflow-hidden flex flex-col h-full">
      <div className="bg-[#1a1c21] px-4 py-3 border-b border-[#2d2f36] flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Option Chain</h3>
        <span className="text-[10px] text-gray-500">EXPIRY: 28 MAR 2024</span>
      </div>

      <div className="overflow-auto flex-grow">
        <table className="w-full text-[11px] mono">
          <thead className="sticky top-0 bg-[#121417] z-10 shadow-sm">
            <tr className="text-gray-500 border-b border-[#2d2f36]">
              <th className="py-2 px-1 text-left font-normal bg-green-500/5">LTP (CE)</th>
              <th className="py-2 px-1 text-left font-normal bg-green-500/5">IV</th>
              <th className="py-2 px-1 text-center font-bold bg-[#1a1c21] text-gray-300">STRIKE</th>
              <th className="py-2 px-1 text-right font-normal bg-red-500/5">IV</th>
              <th className="py-2 px-1 text-right font-normal bg-red-500/5">LTP (PE)</th>
            </tr>
          </thead>
          <tbody>
            {strikes.map((strike) => {
              const call = calls.find(c => c.strike === strike);
              const put = puts.find(p => p.strike === strike);
              const isITM_Call = strike < spotPrice;
              const isITM_Put = strike > spotPrice;

              return (
                <tr key={strike} className="border-b border-[#1a1c21] hover:bg-white/5 transition-colors">
                  <td className={`py-3 px-2 text-green-400 ${isITM_Call ? 'bg-green-500/5' : ''}`}>
                    {call?.ltp.toFixed(2)}
                  </td>
                  <td className={`py-3 px-1 text-gray-500 ${isITM_Call ? 'bg-green-500/5' : ''}`}>
                    {call?.iv.toFixed(1)}
                  </td>
                  <td className="py-3 px-2 text-center font-bold bg-[#1a1c21] text-blue-400 border-x border-[#2d2f36]">
                    {strike}
                  </td>
                  <td className={`py-3 px-1 text-right text-gray-500 ${isITM_Put ? 'bg-red-500/5' : ''}`}>
                    {put?.iv.toFixed(1)}
                  </td>
                  <td className={`py-3 px-2 text-right text-red-400 ${isITM_Put ? 'bg-red-500/5' : ''}`}>
                    {put?.ltp.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OptionChain;
