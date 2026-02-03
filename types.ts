
export enum MarketIndex {
  NIFTY_50 = 'NIFTY 50',
  SENSEX = 'SENSEX'
}

export enum OptionType {
  CALL = 'CE',
  PUT = 'PE'
}

export interface Candlestick {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OptionData {
  strike: number;
  expiry: string;
  type: OptionType;
  ltp: number;
  change: number;
  oi: number;
  iv: number;
  volume: number;
}

export interface TradeSignal {
  symbol: string;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  entry: number; // Index price
  target: number; // Index price
  stopLoss: number; // Index price
  optionEntry: number; // Corresponding option premium
  optionTarget: number; // Corresponding option premium
  optionStopLoss: number; // Corresponding option premium
  recommendedOption: string;
  rationale: string;
  confidence: number;
}

export interface MarketState {
  index: MarketIndex;
  price: number;
  change: number;
  changePercent: number;
  rsi: number;
  trend: 'Up' | 'Down' | 'Sideways';
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface MarketDataResponse {
  price: number;
  change: number;
  changePercent: number;
  history: Candlestick[];
  options: OptionData[];
  sources: GroundingSource[];
}
