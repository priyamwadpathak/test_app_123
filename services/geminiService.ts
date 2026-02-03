
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

  async fetchMarketData(index: MarketIndex): Promise<MarketDataResponse> {
    const ai = this.getClient();
    // Using gemini-3-flash-preview for maximum speed.
    const prompt = `
      Current Time: ${new Date().toISOString()}
      Task: Fetch LIVE market data for ${index}. 
      1. Find current Spot Price and today's percentage change.
      2. Find the Option Chain for the NEAREST Weekly Expiry (e.g., this Thursday for Nifty).
      3. Return 10 strikes: 5 ITM, 5 OTM. 
      4. For each: Strike, Type (CE/PE), LTP (Last Traded Price), IV, and Volume.
      5. Historical Data: Provide a 10-point 15-min interval price history for the current session.
      
      Requirements: 
      - Use Google Search for ground truth.
      - Return ONLY strictly valid JSON. 
      - Ensure LTP is accurate as of the last few minutes.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: "You are a low-latency financial data bridge. Your objective is speed and accuracy. Use search to verify live prices. Output JSON.",
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
    } catch (error) {
      console.error("Gemini Data Fetch Error:", error);
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
    const ai = this.getClient();
    const prompt = `
      Index: ${index} @ ${price}
      RSI: ${rsi.toFixed(2)}
      Options Snippet: ${JSON.stringify(optionChain.slice(0, 4))}
      
      Generate a professional trade signal. 
      - Bullish/Bearish/Neutral bias.
      - Best Strike to trade.
      - Index & Option Entry/Target/SL.
      - 2-sentence rationale.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview", // Also use flash for analysis to stay quick
        contents: prompt,
        config: {
          systemInstruction: "You are a professional Derivatives Analyst. Provide precise, high-speed trading signals in JSON format.",
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
    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
