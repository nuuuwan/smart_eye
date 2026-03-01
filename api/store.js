import { handleCors } from "./_lib/cors.js";
import {
  storeEncryptedImage,
  storeEncryptedMetadata,
} from "./_lib/blobUtils.js";

/**
 * POST /api/store
 *
 * Body:
 *   md5              — document ID (MD5 of original image)
 *   encryptedImage   — base64 AES-GCM ciphertext of the image bytes
 *   encryptedMetadata — base64 AES-GCM ciphertext of the metadata JSON string
 *   mimeType         — original image MIME type (for reference only)
 *   fileName         — original filename
 *
 * Returns:
 *   { imageUrl, metadataUrl }
 */
export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { md5, encryptedImage, encryptedMetadata, mimeType, fileName } =
      req.body;

    if (!md5 || !encryptedImage || !encryptedMetadata) {
      return res
        .status(400)
        .json({ error: "md5, encryptedImage and encryptedMetadata required" });
    }

    const [imageUrl, metadataUrl] = await Promise.all([
      storeEncryptedImage(md5, encryptedImage),
      storeEncryptedMetadata(md5, encryptedMetadata),
    ]);

    return res.status(200).json({ imageUrl, metadataUrl });
  } catch (err) {
    console.error("[store] Error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Internal server error" });
  }
}
