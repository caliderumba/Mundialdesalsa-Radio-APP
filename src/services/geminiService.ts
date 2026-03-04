import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getRadioInfo() {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "Find the official streaming URL (MP3/AAC stream), official website, and social media links (Facebook, Instagram, Twitter/X) for the radio station 'Mundial de Salsa'. Also, try to find if they have an API or a way to get the current song playing.",
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  return response.text;
}
