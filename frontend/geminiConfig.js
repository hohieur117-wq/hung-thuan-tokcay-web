import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
export const visionModel = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
