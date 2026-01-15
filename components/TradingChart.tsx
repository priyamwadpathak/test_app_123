
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Candlestick } from '../types';

interface TradingChartProps {
  data: Candlestick[];
  rsi: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#1a1c21] border border-[#2d2f36] p-3 rounded-lg shadow-xl text-xs">
        <p className="text-gray-400 mb-1 font-medium">{data.time}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span className="text-gray-500">Open:</span> <span className="mono font-bold">{data.open.toFixed(2)}</span>
          <span className="text-gray-500">Close:</span> <span className="mono font-bold text-blue-400">{data.close.toFixed(2)}</span>
          <span className="text-gray-500">High:</span> <span className="mono font-bold text-green-400">{data.high.toFixed(2)}</span>
          <span className="text-gray-500">Low:</span> <span className="mono font-bold text-red-400">{data.low.toFixed(2)}</span>
        </div>
      </div>
    );
  }
  return null;
};

const TradingChart: React.FC<TradingChartProps> = ({ data, rsi }) => {
  const minPrice = Math.min(...data.map(d => d.low)) * 0.999;
  const maxPrice = Math.max(...data.map(d => d.high)) * 1.001;

  // Extract first and last time for range display
  const startTime = data.length > 0 ? data[0].time : '--:--';
  const endTime = data.length > 0 ? data[data.length - 1].time : '--:--';

  return (
    <div className="bg-[#121417] border border-[#2d2f36] rounded-xl p-4 h-[450px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
            Live Price Action
          </h3>
          <p className="text-[10px] text-gray-600 font-medium">RANGE: {startTime} — {endTime}</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-[10px] text-gray-500 uppercase">RSI (14)</p>
            <p className={`text-sm font-bold mono ${rsi > 70 ? 'text-red-400' : rsi < 30 ? 'text-green-400' : 'text-blue-400'}`}>
              {rsi.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d2f36" vertical={false} />
            <XAxis 
              dataKey="time" 
              stroke="#4b5563" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(val) => val.includes(' ') ? val.split(' ')[1] : val}
            />
            <YAxis 
              domain={[minPrice, maxPrice]} 
              stroke="#4b5563" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
              orientation="right"
              tickFormatter={(val) => val.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="close" 
              stroke="#3b82f6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorPrice)" 
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TradingChart;
