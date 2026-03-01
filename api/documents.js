import { handleCors } from "./_lib/cors.js";
import { getIndex, listDocumentStubs, setIndex } from "./_lib/blobUtils.js";

/**
 * GET /api/documents
 *
 * Returns lightweight document stubs (no decryption happens server-side).
 * The client fetches metadataUrl and decrypts with its CryptoKey.
 *
 * Response:
 *   { documents: [{ id, imageUrl, metadataUrl }] }
 */
export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    let documents = await getIndex();

    // One-time migration: if index is empty, scan blobs and seed the index
    if (documents.length === 0) {
      documents = await listDocumentStubs();
      if (documents.length > 0) {
        await setIndex(documents).catch(() => {}); // best-effort; don't fail the request
      }
    }

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
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
