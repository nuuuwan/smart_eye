import { put, list, head } from "@vercel/blob";

const DOC_PREFIX = "smart-eye/documents";

function assertBlobToken() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not set. Add it to .env.local (get one from Vercel Dashboard → Storage → Blob)",
    );
  }
}

/**
 * Returns the blob path prefix for a given document ID (md5 hash).
 */
export function docPath(md5) {
  return `${DOC_PREFIX}/${md5}`;
}

/**
 * Upload the original image to Vercel Blob.
 * @returns {string} public URL of the stored image
 */
export async function storeImage(md5, imageBuffer, mimeType) {
  assertBlobToken();
  const ext = mimeTypeToExt(mimeType);
  const pathname = `${docPath(md5)}/image.${ext}`;
  const blob = await put(pathname, imageBuffer, {
    access: "public",
    contentType: mimeType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return blob.url;
}

/**
 * Upload the extracted metadata JSON to Vercel Blob.
 * @returns {string} public URL of the stored JSON
 */
export async function storeMetadata(md5, metadata) {
  assertBlobToken();
  const pathname = `${docPath(md5)}/metadata.json`;
  const blob = await put(pathname, JSON.stringify(metadata, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return blob.url;
}

/**
 * Check if a document has already been analyzed by looking for its metadata blob.
 * @returns {object|null} existing metadata or null
 */
export async function getExistingMetadata(md5) {
  assertBlobToken();
  try {
    const pathname = `${docPath(md5)}/metadata.json`;
    const blobInfo = await head(pathname);
    if (blobInfo) {
      const res = await fetch(blobInfo.url);
      if (res.ok) {
        const metadata = await res.json();
        // Attach metadataUrl from the blob (not stored inside JSON to avoid double-write)
        return { ...metadata, metadataUrl: blobInfo.url };
      }
    }
  } catch {
    // not found
  }
  return null;
}

/**
 * List all stored documents by finding all metadata.json blobs.
 * @returns {Array} array of document metadata objects with added id/imageUrl/metadataUrl
 */
export async function listAllDocuments() {
  assertBlobToken();
  const allBlobs = [];
  let cursor;

  do {
    const result = await list({
      prefix: `${DOC_PREFIX}/`,
      cursor,
      limit: 1000,
    });
    allBlobs.push(...result.blobs);
    cursor = result.cursor;
    if (!result.hasMore) break;
  } while (true);

  // Find all metadata.json blobs
  const metadataBlobs = allBlobs.filter((b) =>
    b.pathname.endsWith("/metadata.json"),
  );

  const documents = await Promise.all(
    metadataBlobs.map(async (blob) => {
      try {
        const res = await fetch(blob.url);
        if (!res.ok) return null;
        const metadata = await res.json();
        // Attach metadataUrl from the blob listing (not stored inside JSON)
        return { ...metadata, metadataUrl: blob.url };
      } catch {
        return null;
      }
    }),
  );

  return documents.filter(Boolean);
}

// ─── Config (salt + verify token) ────────────────────────────────────────────

const CONFIG_PATH = "smart-eye/config.json";

/**
 * Read the global config blob ({salt, verify}).
 * @returns {object|null}
 */
export async function getConfig() {
  assertBlobToken();
  try {
    const info = await head(CONFIG_PATH);
    if (!info) return null;
    const res = await fetch(info.url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Write the global config blob.
 * @param {{ salt: string, verify: string }} config
 */
export async function setConfig(config) {
  assertBlobToken();
  await put(CONFIG_PATH, JSON.stringify(config), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

// ─── Encrypted storage ───────────────────────────────────────────────────────

/**
 * Store AES-GCM encrypted image (base64 string).
 * @returns {string} public URL
 */
export async function storeEncryptedImage(md5, encryptedBase64) {
  assertBlobToken();
  const pathname = `${docPath(md5)}/image.enc`;
  const blob = await put(pathname, encryptedBase64, {
    access: "public",
    contentType: "text/plain",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return blob.url;
}

/**
 * Store AES-GCM encrypted metadata JSON (base64 string).
 * @returns {string} public URL
 */
export async function storeEncryptedMetadata(md5, encryptedBase64) {
  assertBlobToken();
  const pathname = `${docPath(md5)}/metadata.enc`;
  const blob = await put(pathname, encryptedBase64, {
    access: "public",
    contentType: "text/plain",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return blob.url;
}

/**
 * Check whether encrypted blobs already exist for this document.
 * @returns {{ metadataUrl: string, imageUrl: string } | null}
 */
export async function checkEncryptedExists(md5) {
  assertBlobToken();
  try {
    const [imgInfo, metaInfo] = await Promise.all([
      head(`${docPath(md5)}/image.enc`),
      head(`${docPath(md5)}/metadata.enc`),
    ]);
    if (imgInfo && metaInfo) {
      return { imageUrl: imgInfo.url, metadataUrl: metaInfo.url };
    }
  } catch {
    // not found
  }
  return null;
}

/**
 * List all documents as lightweight stubs (no decryption).
 * @returns {Array<{ id: string, imageUrl: string, metadataUrl: string }>}
 */
export async function listDocumentStubs() {
  assertBlobToken();
  const allBlobs = [];
  let cursor;

  do {
    const result = await list({
      prefix: `${DOC_PREFIX}/`,
      cursor,
      limit: 1000,
    });
    allBlobs.push(...result.blobs);
    cursor = result.cursor;
    if (!result.hasMore) break;
  } while (true);

  // Group by md5
  const byMd5 = {};
  for (const b of allBlobs) {
    // pathname: smart-eye/documents/{md5}/image.enc  or  metadata.enc
    const parts = b.pathname.split("/");
    if (parts.length < 4) continue;
    const md5 = parts[2];
    const file = parts[3];
    if (!byMd5[md5]) byMd5[md5] = {};
    if (file === "image.enc") byMd5[md5].imageUrl = b.url;
    if (file === "metadata.enc") byMd5[md5].metadataUrl = b.url;
  }

  return Object.entries(byMd5)
    .filter(([, v]) => v.imageUrl && v.metadataUrl)
    .map(([id, v]) => ({
      id,
      imageUrl: v.imageUrl,
      metadataUrl: v.metadataUrl,
    }));
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function mimeTypeToExt(mimeType) {
  const map = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/bmp": "bmp",
    "image/tiff": "tiff",
    "application/pdf": "pdf",
  };
  return map[mimeType] || "jpg";
}
