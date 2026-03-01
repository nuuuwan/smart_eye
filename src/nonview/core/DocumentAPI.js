import {
  checkVerifyToken,
  decryptToString,
  deriveKey,
  encryptBase64Image,
  encryptString,
  generateSalt,
  VERIFY_TOKEN,
  bufToBase64,
  base64ToBuf,
} from "./CryptoUtils";

const BASE_URL = process.env.REACT_APP_API_BASE_URL || "";

// ─── Config (salt + verify token) ────────────────────────────────────────────

/**
 * GET /api/config → { salt, verify } or null if not configured.
 */
export async function fetchConfig() {
  try {
    const res = await fetch(`${BASE_URL}/api/config`);
    if (!res.ok) return null;
    const body = await res.json();
    // Empty object means no config yet
    if (!body.salt) return null;
    return body;
  } catch {
    return null;
  }
}

/**
 * Generate salt, derive CryptoKey, encrypt VERIFY_TOKEN, POST /api/config.
 * @returns {CryptoKey}
 */
export async function createConfig(password) {
  const salt = generateSalt(); // Uint8Array
  const cryptoKey = await deriveKey(password, salt);
  const verifyEnc = await encryptString(cryptoKey, VERIFY_TOKEN);
  const saltB64 = bufToBase64(salt);

  const res = await fetch(`${BASE_URL}/api/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ salt: saltB64, verify: verifyEnc }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create config");
  }
  return cryptoKey;
}

/**
 * Fetch config, derive key from password, verify token.
 * @returns {CryptoKey | null} null if wrong password
 */
export async function unlockWithPassword(password) {
  const config = await fetchConfig();
  if (!config) throw new Error("No password has been set yet.");

  const saltBuf = base64ToBuf(config.salt);
  const cryptoKey = await deriveKey(password, saltBuf);
  const valid = await checkVerifyToken(cryptoKey, config.verify);
  return valid ? cryptoKey : null;
}

// ─── Document processing ──────────────────────────────────────────────────────

/**
 * Convert a File to a base64 string (data URI prefix stripped).
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Full pipeline: analyze with Gemini → encrypt → store encrypted blobs.
 *
 * If the document already exists (cached), fetches + decrypts existing metadata.
 *
 * @param {File} file
 * @param {CryptoKey} cryptoKey
 * @returns {Promise<object>} full plaintext document metadata
 */
export async function processDocument(file, cryptoKey) {
  const imageData = await fileToBase64(file);

  // Step 1: Analyze (compute MD5 + call Gemini if not cached)
  let analyzeRes;
  try {
    analyzeRes = await fetch(`${BASE_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageData,
        mimeType: file.type || "image/jpeg",
        fileName: file.name,
      }),
    });
  } catch {
    throw new Error(
      "Cannot reach backend. Run 'vercel dev' instead of 'npm start'.",
    );
  }
  if (!analyzeRes.ok) {
    const err = await analyzeRes.json().catch(() => ({}));
    throw new Error(err.error || "Failed to analyze document");
  }
  let analyzed = await analyzeRes.json();

  // Step 2a: Already cached — try decrypt; if key mismatch, force re-analyze
  if (analyzed.cached) {
    try {
      const encMeta = await fetch(analyzed.metadataUrl).then((r) => r.text());
      const metaJson = await decryptToString(cryptoKey, encMeta);
      const metadata = JSON.parse(metaJson);
      return {
        ...metadata,
        imageUrl: analyzed.imageUrl,
        metadataUrl: analyzed.metadataUrl,
      };
    } catch {
      // Cached blobs were encrypted with a different key (stale salt).
      // Force a fresh Gemini analysis and re-encrypt with the current key.
      let reanalyzeRes;
      try {
        reanalyzeRes = await fetch(`${BASE_URL}/api/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageData,
            mimeType: file.type || "image/jpeg",
            fileName: file.name,
            forceAnalyze: true,
          }),
        });
      } catch {
        throw new Error("Cannot reach backend when re-analyzing document.");
      }
      if (!reanalyzeRes.ok) {
        const err = await reanalyzeRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to re-analyze document");
      }
      analyzed = await reanalyzeRes.json();
      // Fall through to the new-doc encrypt+store path below
    }
  }

  // Step 2b: New doc — encrypt image + metadata, POST to /api/store
  const [encryptedImage, encryptedMetadata] = await Promise.all([
    encryptBase64Image(cryptoKey, imageData),
    encryptString(
      cryptoKey,
      JSON.stringify({
        id: analyzed.id,
        author: analyzed.author,
        title: analyzed.title,
        date: analyzed.date,
        type: analyzed.type,
        data: analyzed.data,
        fileName: analyzed.fileName,
        analyzedAt: analyzed.analyzedAt,
        mimeType: file.type || "image/jpeg",
      }),
    ),
  ]);

  let storeRes;
  try {
    storeRes = await fetch(`${BASE_URL}/api/store`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        md5: analyzed.id,
        encryptedImage,
        encryptedMetadata,
        mimeType: file.type || "image/jpeg",
        fileName: file.name,
      }),
    });
  } catch {
    throw new Error("Cannot reach backend when storing document.");
  }
  if (!storeRes.ok) {
    const err = await storeRes.json().catch(() => ({}));
    throw new Error(err.error || "Failed to store document");
  }
  const { imageUrl, metadataUrl } = await storeRes.json();

  return {
    id: analyzed.id,
    author: analyzed.author,
    title: analyzed.title,
    date: analyzed.date,
    type: analyzed.type,
    data: analyzed.data,
    fileName: analyzed.fileName,
    analyzedAt: analyzed.analyzedAt,
    mimeType: file.type || "image/jpeg",
    imageUrl,
    metadataUrl,
  };
}

// ─── Document listing ─────────────────────────────────────────────────────────

/**
 * Fetch document stubs from /api/documents, decrypt each metadata blob.
 * @param {CryptoKey} cryptoKey
 * @returns {Promise<object[]>} array of plaintext document metadata
 */
export async function listAndDecryptDocuments(cryptoKey) {
  let res;
  try {
    res = await fetch(`${BASE_URL}/api/documents`);
  } catch {
    throw new Error(
      "Cannot reach backend. Run 'vercel dev' instead of 'npm start'.",
    );
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch documents");
  }
  const { documents: stubs } = await res.json();

  const results = await Promise.all(
    stubs.map(async (stub) => {
      try {
        const encMeta = await fetch(stub.metadataUrl).then((r) => r.text());
        const metaJson = await decryptToString(cryptoKey, encMeta);
        const metadata = JSON.parse(metaJson);
        return {
          ...metadata,
          imageUrl: stub.imageUrl,
          metadataUrl: stub.metadataUrl,
        };
      } catch {
        return null; // Skip documents that fail to decrypt (wrong key etc.)
      }
    }),
  );

  return results
    .filter(Boolean)
    .sort((a, b) => new Date(b.analyzedAt ?? 0) - new Date(a.analyzedAt ?? 0));
}

// Keep legacy export names for any residual imports (unused but harmless)
export { fileToBase64 };
