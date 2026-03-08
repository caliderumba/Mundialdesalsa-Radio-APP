import { GoogleGenerativeAI } from "@google/genai";

// Acceso a la clave de API (Asegúrate de que esté en las Variables de Entorno de tu servidor)
const apiKey = process.env.GEMINI_API_KEY || "";

// Inicializamos el cliente de forma segura
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Obtiene la letra de una canción utilizando la IA de Gemini.
 * @param title Título de la canción
 * @param artist Nombre del artista
 * @returns La letra de la canción o un mensaje de error amigable.
 */
export async function getSongLyrics(title: string, artist: string): Promise<string> {
  if (!genAI) {
    console.error("Error: GEMINI_API_KEY no encontrada en el servidor.");
    throw new Error("Servicio de IA no configurado");
  }

  try {
    // Usamos el modelo flash que es más rápido y eficiente para texto
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Actúa como un experto en salsa. Proporciona la letra original de la canción "${title}" de "${artist}". 
    REGLAS ESTRICTAS:
    1. Devuelve SOLAMENTE la letra de la canción.
    2. No incluyas "Aquí tienes la letra", ni títulos, ni notas al final.
    3. Si no conoces la letra exacta, responde únicamente: "Letra no disponible".`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Limpieza básica por si la IA agrega espacios o comillas extra
    return text.trim() || "Letra no disponible";

  } catch (error) {
    console.error("Error al consultar Gemini:", error);
    return "Error al obtener la letra de la IA.";
  }
}
