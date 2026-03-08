import { GoogleGenerativeAI } from "@google/genai";

// Usamos la API Key desde las variables de entorno del servidor
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function getSongLyrics(title: string, artist: string) {
  if (!genAI) throw new Error("API Key no configurada");

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `Proporciona la letra de la canción de salsa "${title}" del artista "${artist}". 
  Devuelve estrictamente solo la letra, sin introducciones ni comentarios. 
  Si no la encuentras, responde: "Letra no disponible".`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}
