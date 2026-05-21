/**
 * Gemini API client — for any client-side AI calls
 * Main AI logic runs on the backend (FastAPI)
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

// Only use this for lightweight client-side tasks
export function getGeminiClient() {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
}

export async function generateClientSideResponse(prompt: string): Promise<string> {
  const client = getGeminiClient();
  if (!client) return "";
  const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  return result.response.text();
}
