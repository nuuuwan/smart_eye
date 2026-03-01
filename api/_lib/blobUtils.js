import { put, list, head } from "@vercel/blob";

const DOC_PREFIX = "smart-eye/documents";

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
  const ext = mimeTypeToExt(mimeType);
  const pathname = `${docPath(md5)}/image.${ext}`;
  const blob = await put(pathname, imageBuffer, {
    access: "public",
    contentType: mimeType,
    addRandomSuffix: false,
  });
  return blob.url;
}

/**
 * Upload the extracted metadata JSON to Vercel Blob.
 * @returns {string} public URL of the stored JSON
 */
export async function storeMetadata(md5, metadata) {
  const pathname = `${docPath(md5)}/metadata.json`;
  const blob = await put(pathname, JSON.stringify(metadata, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
  return blob.url;
}

/**
 * Check if a document has already been analyzed by looking for its metadata blob.
 * @returns {object|null} existing metadata or null
 */
export async function getExistingMetadata(md5) {
  try {
    const pathname = `${docPath(md5)}/metadata.json`;
    const blobInfo = await head(pathname);
    if (blobInfo) {
      const res = await fetch(blobInfo.url);
      if (res.ok) return await res.json();
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
        return metadata;
      } catch {
        return null;
      }
    }),
  );

  return documents.filter(Boolean);
}

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
