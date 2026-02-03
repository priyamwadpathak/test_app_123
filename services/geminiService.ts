
import { GoogleGenAI, Type } from "@google/genai";
import { MarketIndex, TradeSignal, Candlestick, OptionData, MarketDataResponse, GroundingSource } from "../types";

export class GeminiService {
  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  private cleanJson(text: string): string {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? jsonMatch[0] : text.trim();
  }

  private async withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      if (retries > 0 && (error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED')) {
        console.warn(`Rate limited. Retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.withRetry(fn, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  async fetchMarketData(index: MarketIndex): Promise<MarketDataResponse> {
    return this.withRetry(async () => {
      const ai = this.getClient();
      const today = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
      
      const prompt = `
        DATE: ${today} | INDEX: ${index}
        GET: 
        1. Current Spot Price & % Change (NSE India).
        2. Option Chain (Nearest Weekly Expiry): 10 strikes (5 ITM, 5 OTM). Strike, LTP (CE/PE).
        3. 10-point Intraday price history (15m intervals).
        JSON ONLY. Accurate LTP.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: `Institutional data bridge. Accuracy first. Use Google Search for live NSE/BSE prices. Return valid JSON.`,
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

      const cleanedText = this.cleanJson(response.text || '{}');
      const data = JSON.parse(cleanedText);
      
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
    });
  }

  async analyzeMarket(
    index: MarketIndex, 
    price: number, 
    rsi: number, 
    recentData: Candlestick[], 
    optionChain: OptionData[]
  ): Promise<TradeSignal> {
    return this.withRetry(async () => {
      const ai = this.getClient();
      const prompt = `
        Market: ${index} @ ${price} | RSI: ${rsi.toFixed(2)}
        Chain: ${JSON.stringify(optionChain.map(o => ({ s: o.strike, t: o.type, p: o.ltp })))}
        Task: High-Conviction Intraday Trend Analysis. Suggest entry ONLY if conviction > 75%.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview", 
        contents: prompt,
        config: {
          systemInstruction: "Senior Derivatives Strategist. Suggest entries only on clear trend alignment. Output JSON.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING },
              direction: { type: Type.STRING },
              entry: { type: Type.NUMBER },
              target: { type: Type.NUMBER },
              stopLoss: { type: Type.NUMBER },
              optionEntry: { type: Type.NUMBER },
              optionTarget: { type: Type.NUMBER },
              optionStopLoss: { type: Type.NUMBER },
              recommendedOption: { type: Type.STRING },
              rationale: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
            },
            required: ['symbol', 'direction', 'entry', 'target', 'stopLoss', 'optionEntry', 'optionTarget', 'optionStopLoss', 'recommendedOption', 'rationale', 'confidence']
          }
        }
      });

      return JSON.parse(this.cleanJson(response.text || '{}'));
    });
  }
}

export const geminiService = new GeminiService();
