import { handleCors } from "./_lib/cors.js";
import { listAllDocuments } from "./_lib/blobUtils.js";

/**
 * GET /api/documents
 *
 * Returns an array of all stored document metadata objects, each containing:
 *   id, author, title, date, type, data, imageUrl, metadataUrl, fileName, analyzedAt
 */
export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const documents = await listAllDocuments();
    // Sort newest first
    documents.sort(
      (a, b) => new Date(b.analyzedAt ?? 0) - new Date(a.analyzedAt ?? 0),
    );
    return res.status(200).json({ documents });
  } catch (err) {
    console.error("[documents] Error:", err);
    const message =
      err?.message ||
      (typeof err === "string" ? err : null) ||
      String(err) ||
      "Internal server error";
    return res.status(500).json({ error: message });
  }
}
