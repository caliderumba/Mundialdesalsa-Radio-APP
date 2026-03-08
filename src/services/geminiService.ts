import { GoogleGenerativeAI } from "@google/genai";

// Configuración de la API Key desde el entorno del servidor
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Genera un dato curioso de salsa usando Gemini 1.5 Flash.
 * Diseñado para ser invocado cada hora por el servidor.
 */
export async function getSalsaTrivia(): Promise<string> {
  if (!genAI) {
    console.error("Error: GEMINI_API_KEY no configurada.");
    return "Cali es la Capital Mundial de la Salsa. ¡Disfruta el pregón!";
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Actúa como un experto historiador de salsa de Cali. 
    Genera un dato curioso, breve y fascinante sobre la salsa, sus artistas icónicos o la cultura salsera en Cali.
    
    REGLAS ESTRICTAS:
    1. Máximo 140 caracteres (estilo notificación).
    2. Usa un tono con "sabor" caleño pero profesional.
    3. No uses introducciones como "Sabías que" o "Hola". Ve directo al dato.
    4. Responde ÚNICAMENTE el texto del dato curioso.
    5. No inventes datos, usa hechos reales de la historia de la música.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();

    return text || "La salsa es el latido de Cali. ¡A azotar baldosa!";
  } catch (error) {
    console.error("Error al generar trivia con Gemini:", error);
    return "Cali es Cali, lo demás es loma. ¡Escucha el mejor sabor!";
  }
}
