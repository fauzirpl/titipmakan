import { GoogleGenAI } from "@google/genai";
import { MenuItem } from "../types";

// Helper to get formatted menu string
const formatMenuForPrompt = (menus: MenuItem[]): string => {
  return menus.map(m => `- ${m.name} (${m.category}): Rp${m.price}`).join('\n');
};

export const GeminiService = {
  getRecommendation: async (menus: MenuItem[], userQuery?: string): Promise<string> => {
    if (!process.env.API_KEY) {
      return "Maaf, kunci API belum dikonfigurasi. Hubungi administrator.";
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const menuList = formatMenuForPrompt(menus);
      
      const prompt = `
        Kamu adalah asisten makan siang kantor yang ceria dan membantu.
        Berikut adalah daftar menu yang tersedia di kantin hari ini:
        ${menuList}

        ${userQuery ? `Pengguna bertanya: "${userQuery}"` : 'Berikan satu rekomendasi paket makan siang yang enak dan hemat.'}
        
        Jawab dalam Bahasa Indonesia yang santai tapi sopan. Jangan terlalu panjang, maksimal 2 paragraf singkat.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text || "Maaf, saya sedang bingung memilih. Coba lagi nanti!";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Maaf, asisten sedang istirahat (Error koneksi).";
    }
  }
};
