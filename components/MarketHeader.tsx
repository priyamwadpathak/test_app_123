
import React from 'react';
import { MarketIndex, MarketState } from '../types';

interface MarketHeaderProps {
  markets: Record<MarketIndex, MarketState>;
  activeMarket: MarketIndex;
  setActiveMarket: (m: MarketIndex) => void;
}

const MarketHeader: React.FC<MarketHeaderProps> = ({ markets, activeMarket, setActiveMarket }) => {
  return (
    <header className="bg-[#121417] border-b border-[#2d2f36] sticky top-0 z-50 px-4 md:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">Q</div>
            <span className="text-xl font-bold tracking-tight text-white">OptiQuant <span className="text-blue-500">Pro</span></span>
          </div>
          <nav className="hidden md:flex space-x-1">
            {Object.values(MarketIndex).map((index) => (
              <button
                key={index}
                onClick={() => setActiveMarket(index)}
                className={`px-4 py-2 rounded-md transition-all text-sm font-medium ${
                  activeMarket === index 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-600/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {index}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center space-x-6 overflow-x-auto pb-2 md:pb-0">
          {Object.values(MarketIndex).map((index) => {
            const m = markets[index];
            const isPos = m.change >= 0;
            return (
              <div 
                key={index} 
                onClick={() => setActiveMarket(index)}
                className={`flex flex-col cursor-pointer transition-opacity ${activeMarket === index ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{index}</span>
                  <span className={`text-xs font-bold px-1 rounded ${isPos ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {isPos ? '▲' : '▼'} {m.changePercent.toFixed(2)}%
                  </span>
                </div>
                <span className="text-lg font-bold mono">{m.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
};

export default MarketHeader;
