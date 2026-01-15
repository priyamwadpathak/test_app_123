
import { GoogleGenAI, Type } from "@google/genai";
import { MarketIndex, TradeSignal, Candlestick, OptionData, MarketDataResponse, GroundingSource } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async fetchMarketData(index: MarketIndex): Promise<MarketDataResponse> {
    const prompt = `
      Fetch the latest live market price, 1-day change, and near-the-money weekly expiry option chain for ${index}.
      Also, provide a simulated 10-point price history for the last 1 hour at 5-minute intervals based on the current trend.
      Return the data strictly in JSON format.
      The option chain should include at least 5 strikes around the current spot price for both CE and PE.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              price: { type: Type.NUMBER },
              change: { type: Type.NUMBER },
              changePercent: { type: Type.NUMBER },
              history: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    time: { type: Type.STRING },
                    open: { type: Type.NUMBER },
                    high: { type: Type.NUMBER },
                    low: { type: Type.NUMBER },
                    close: { type: Type.NUMBER },
                    volume: { type: Type.NUMBER }
                  }
                }
              },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    strike: { type: Type.NUMBER },
                    expiry: { type: Type.STRING },
                    type: { type: Type.STRING },
                    ltp: { type: Type.NUMBER },
                    change: { type: Type.NUMBER },
                    oi: { type: Type.NUMBER },
                    iv: { type: Type.NUMBER },
                    volume: { type: Type.NUMBER }
                  }
                }
              }
            },
            required: ['price', 'change', 'changePercent', 'history', 'options']
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      
      // Extract grounding sources as required by instructions
      const sources: GroundingSource[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web) {
            sources.push({
              title: chunk.web.title || 'Market Source',
              uri: chunk.web.uri
            });
          }
        });
      }

      return { ...data, sources };
    } catch (error) {
      console.error("Gemini Fetch Data Error:", error);
      throw error;
    }
  }

  async analyzeMarket(
    index: MarketIndex, 
    price: number, 
    rsi: number, 
    recentData: Candlestick[], 
    optionChain: OptionData[]
  ): Promise<TradeSignal> {
    const prompt = `
      Act as a senior Quantitative Options Trader. Analyze the following data for ${index}:
      - Current Price: ${price}
      - RSI (14): ${rsi}
      - Recent Price Action (Last 5 candles): ${JSON.stringify(recentData.slice(-5))}
      - Near-the-money Option Chain snippet: ${JSON.stringify(optionChain.slice(0, 6))}

      Task:
      1. Identify the immediate trade direction based on Price Action (support/resistance, trend) and RSI momentum.
      2. Suggest a specific Strike Price and Option Type (CE or PE).
      3. Define clear Entry, Target, and Stop Loss.
      4. Provide a 1-sentence professional rationale.

      Output strictly in JSON format.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING },
              direction: { type: Type.STRING, enum: ['BULLISH', 'BEARISH', 'NEUTRAL'] },
              entry: { type: Type.NUMBER },
              target: { type: Type.NUMBER },
              stopLoss: { type: Type.NUMBER },
              recommendedOption: { type: Type.STRING },
              rationale: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
            },
            required: ['symbol', 'direction', 'entry', 'target', 'stopLoss', 'recommendedOption', 'rationale', 'confidence']
          }
        }
      });

      return JSON.parse(response.text || '{}');
    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
