import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `You are an expert document analysis AI. Carefully examine this document image and extract ALL information from it.

Return ONLY a valid JSON object (no markdown, no code blocks, no explanation) with exactly these fields:

{
  "author": "Document author, creator, or source organization. Use null if not found.",
  "title": "The main title or heading of the document. Use null if not found.",
  "date": "Document date in ISO 8601 format (YYYY-MM-DD). Use null if not found.",
  "type": "Document type such as: invoice, receipt, letter, report, contract, article, form, certificate, bank statement, medical record, ID document, etc.",
  "data": {
    // All structured information found in the document.
    // Use meaningful keys matching the document content.
    // Preserve all numbers, amounts, addresses, names, line items, etc.
  }
}

Be thorough - capture every piece of information visible in the document.`;

export async function analyzeDocumentWithGemini(base64Image, mimeType) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY environment variable not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent([
    {
      inlineData: {
        data: base64Image,
        mimeType: mimeType || "image/jpeg",
      },
    },
    SYSTEM_PROMPT,
  ]);

  const text = result.response.text();

  // Strip markdown code fences if present
  const clean = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  return JSON.parse(clean);
}
