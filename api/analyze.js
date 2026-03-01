import crypto from "crypto";
import { handleCors } from "./_lib/cors.js";
import { analyzeDocumentWithGemini } from "./_lib/gemini.js";
import { checkEncryptedExists } from "./_lib/blobUtils.js";

/**
 * POST /api/analyze
 *
 * Analyzes an image with Gemini AI and returns extracted metadata.
 * Does NOT store anything — the client encrypts and calls /api/store.
 *
 * Body (JSON):
 *   imageData  - base64-encoded image string (no data: URI prefix)
 *   mimeType   - e.g. "image/jpeg"
 *   fileName   - original filename (optional)
 *
 * Returns (JSON):
 *   id          - MD5 hash of the image content
 *   cached      - true if encrypted blobs already exist in storage
 *   imageUrl    - (only when cached:true) existing encrypted image URL
 *   metadataUrl - (only when cached:true) existing encrypted metadata URL
 *   author      - (only when cached:false) extracted from LLM
 *   title       - (only when cached:false)
 *   date        - (only when cached:false)
 *   type        - (only when cached:false)
 *   data        - (only when cached:false)
 *   fileName    - (only when cached:false)
 *   analyzedAt  - (only when cached:false) ISO timestamp
 */
export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      imageData,
      mimeType = "image/jpeg",
      fileName = "document",
      forceAnalyze = false,
    } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: "imageData is required" });
    }

    // Compute MD5 of the raw image bytes
    const imageBuffer = Buffer.from(imageData, "base64");
    const md5 = crypto.createHash("md5").update(imageBuffer).digest("hex");

    // Check if encrypted blobs already exist for this document (skip if forceAnalyze)
    if (!forceAnalyze) {
      const existing = await checkEncryptedExists(md5);
      if (existing) {
        return res.status(200).json({
          id: md5,
          cached: true,
          imageUrl: existing.imageUrl,
          metadataUrl: existing.metadataUrl,
        });
      }
    }

    // Analyze with Gemini (no storage here)
    const extracted = await analyzeDocumentWithGemini(imageData, mimeType);

    return res.status(200).json({
      id: md5,
      cached: false,
      author: extracted.author ?? null,
      title: extracted.title ?? null,
      date: extracted.date ?? null,
      type: extracted.type ?? "unknown",
      data: extracted.data ?? {},
      fileName,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[analyze] Error:", err);
    const message =
      err?.message ||
      (typeof err === "string" ? err : null) ||
      String(err) ||
      "Internal server error";
    return res.status(500).json({ error: message });
  }
}
