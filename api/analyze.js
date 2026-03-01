import crypto from "crypto";
import { handleCors } from "./_lib/cors.js";
import { analyzeDocumentWithGemini } from "./_lib/gemini.js";
import {
  storeImage,
  storeMetadata,
  getExistingMetadata,
  docPath,
} from "./_lib/blobUtils.js";

/**
 * POST /api/analyze
 *
 * Body (JSON):
 *   imageData  - base64-encoded image string (no data: URI prefix)
 *   mimeType   - e.g. "image/jpeg"
 *   fileName   - original filename (optional)
 *
 * Returns (JSON):
 *   id          - MD5 hash of the image content
 *   author      - document author / source
 *   title       - document title
 *   date        - document date (ISO 8601 or null)
 *   type        - document type
 *   data        - all structured content
 *   imageUrl    - Vercel Blob URL of the stored image
 *   metadataUrl - Vercel Blob URL of the stored JSON
 *   cached      - true if the result was already stored
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
    } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: "imageData is required" });
    }

    // Compute MD5 of the raw image bytes
    const imageBuffer = Buffer.from(imageData, "base64");
    const md5 = crypto.createHash("md5").update(imageBuffer).digest("hex");

    // Check if this document was already analyzed
    const existing = await getExistingMetadata(md5);
    if (existing) {
      return res.status(200).json({ ...existing, cached: true });
    }

    // Analyze with Gemini
    const extracted = await analyzeDocumentWithGemini(imageData, mimeType);

    // Upload image to Vercel Blob
    const imageUrl = await storeImage(md5, imageBuffer, mimeType);

    // Build the full metadata record
    const metadata = {
      id: md5,
      author: extracted.author ?? null,
      title: extracted.title ?? null,
      date: extracted.date ?? null,
      type: extracted.type ?? "unknown",
      data: extracted.data ?? {},
      imageUrl,
      metadataUrl: null, // will be set after upload
      fileName,
      analyzedAt: new Date().toISOString(),
    };

    // Upload metadata JSON to Vercel Blob
    const metadataUrl = await storeMetadata(md5, {
      ...metadata,
      metadataUrl: `https://PENDING`, // placeholder
    });

    // Re-upload with the real metadataUrl
    metadata.metadataUrl = metadataUrl;
    await storeMetadata(md5, metadata);

    return res.status(200).json({ ...metadata, cached: false });
  } catch (err) {
    console.error("[analyze] Error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Internal server error" });
  }
}
