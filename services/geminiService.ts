
import { GoogleGenAI, Type } from "@google/genai";
import { MarketIndex, TradeSignal, Candlestick, OptionData, MarketDataResponse, GroundingSource } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  /**
   * Cleans the AI response string by removing potential markdown blocks (e.g. ```json ... ```)
   */
  private cleanJsonResponse(text: string): string {
    const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
    const match = text.match(jsonBlockRegex);
    if (match && match[1]) {
      return match[1].trim();
    }
    return text.trim();
  }

  async fetchMarketData(index: MarketIndex): Promise<MarketDataResponse> {
    const prompt = `
      Act as a high-speed financial data terminal. Use Google Search to find:
      1. Current live spot price of ${index}.
      2. Today's percentage change and point change.
      3. The current weekly option chain near-the-money (3 strikes above, 3 strikes below spot).
      4. Generate a 10-point price history for the last 60 minutes based on today's actual price movement trends.

      Return the result as a raw JSON object matching this schema exactly. Do not include extra text.
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
                    type: { type: Type.STRING, enum: ['CE', 'PE'] },
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

      const rawText = response.text || '';
      const cleanedJson = this.cleanJsonResponse(rawText);
      const data = JSON.parse(cleanedJson || '{}');
      
      const sources: GroundingSource[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web) {
            sources.push({
              title: chunk.web.title || 'Market Feed',
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
      Strategy Analysis: Price Action + RSI.
      Index: ${index}
      Price: ${price}
      RSI: ${rsi}
      History: ${JSON.stringify(recentData.slice(-10))}
      Options: ${JSON.stringify(optionChain)}

      Task: Determine trade direction, target, and stop loss. Recommend the best option strike from the provided chain.
      Output: JSON only.
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

      const cleanedJson = this.cleanJsonResponse(response.text || '{}');
      return JSON.parse(cleanedJson);
    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
