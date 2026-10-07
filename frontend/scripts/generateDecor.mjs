import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) { console.error("❌ Thiếu GEMINI_API_KEY"); process.exit(1); }

const genAI = new GoogleGenerativeAI(apiKey);
async function generateSVGs() {
  console.log("🚀 Đang kết nối Gemini API...");
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
  const prompt = `Bạn là UI/UX Designer. Trả về JSON chứa code Inline SVG Line-art thuần túy (viewBox="0 0 24 24", stroke="currentColor", strokeWidth="1.5", fill="none").
  Cấu trúc JSON yêu cầu (mỗi mảng 5 chuỗi SVG):
  {
    "default": ["mì", "tỏi", "tokbokki", "chả cá", "chữ Hàn"], "spring": ["hoa mai", "mầm cây", "én", "lá", "mây"],
    "summer": ["mặt trời", "nước đá", "dưa hấu", "sóng", "kem"], "autumn": ["lá phong", "quả sồi", "gió", "nấm", "trăng"],
    "winter": ["tuyết", "thông", "người tuyết", "cacao", "găng tay"], "tetDuongLich": ["pháo hoa", "lịch", "rượu", "pháo giấy", "sao"],
    "tetAmLich": ["lì xì", "đồng xu", "cành mai", "lồng đèn", "pháo nổ"], "quocKhanh": ["ngôi sao", "lá cờ", "bồ câu", "vinh quang", "pháo"],
    "trungThu": ["lồng đèn", "bánh trung thu", "trăng", "thỏ", "mây"]
  }`;
  try {
    const result = await model.generateContent(prompt);
    const outputDir = path.resolve("./components");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    fs.writeFileSync(path.join(outputDir, "DecorIcons.jsx"), `export const THEME_ICONS = ${result.response.text()};`, "utf-8");
    console.log("✅ Đã lưu SVG vào components/DecorIcons.jsx");
  } catch (error) { console.error("❌ Lỗi API:", error); }
}
generateSVGs();
