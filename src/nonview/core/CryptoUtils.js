/**
 * Client-side AES-GCM encryption using the Web Crypto API.
 * Key derivation via PBKDF2-SHA256.
 */

export const VERIFY_TOKEN = "smart-eye-verify-v1";
const PBKDF2_ITERATIONS = 200000;

/** Convert ArrayBuffer / Uint8Array to base64 string (safe for large buffers) */
export function bufToBase64(buf) {
  const bytes = new Uint8Array(buf instanceof ArrayBuffer ? buf : buf.buffer);
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Convert base64 string to Uint8Array */
export function base64ToBuf(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** Generate a random 16-byte salt */
export function generateSalt() {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Derive an AES-GCM 256-bit key from a password and salt via PBKDF2.
 * @param {string} password
 * @param {Uint8Array} salt
 * @returns {Promise<CryptoKey>}
 */
export async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypt arbitrary bytes with AES-GCM.
 * The returned base64 string encodes [12-byte IV || ciphertext].
 * @param {CryptoKey} key
 * @param {Uint8Array|ArrayBuffer} data
 * @returns {Promise<string>} base64
 */
export async function encrypt(key, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );
  const combined = new Uint8Array(12 + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), 12);
  return bufToBase64(combined);
}

/**
 * Decrypt a base64 blob produced by encrypt().
 * @returns {Promise<ArrayBuffer>}
 */
export async function decrypt(key, encB64) {
  const combined = base64ToBuf(encB64);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
}

/** Encrypt a string, returns base64 */
export async function encryptString(key, str) {
  const enc = new TextEncoder();
  return encrypt(key, enc.encode(str));
}

/** Decrypt a base64 blob to a string */
export async function decryptToString(key, encB64) {
  const buf = await decrypt(key, encB64);
  return new TextDecoder().decode(buf);
}

/**
 * Encrypt a base64-encoded image string (as produced by FileReader).
 * Returns a base64-encoded encrypted blob.
 */
export async function encryptBase64Image(key, imageBase64) {
  const raw = base64ToBuf(imageBase64);
  return encrypt(key, raw);
}

/**
 * Decrypt an encrypted image blob → object URL for use in <img>.
 * Revoke the returned URL when done to free memory.
 */
export async function decryptImageToObjectURL(key, encB64, mimeType) {
  const buf = await decrypt(key, encB64);
  const blob = new Blob([buf], { type: mimeType || "image/jpeg" });
  return URL.createObjectURL(blob);
}

/**
 * Verify that a given password produces the correct key for a stored verify token.
 * @returns {Promise<boolean>}
 */
export async function checkVerifyToken(key, encVerify) {
  try {
    const decrypted = await decryptToString(key, encVerify);
    return decrypted === VERIFY_TOKEN;
  } catch {
    return false;
  }
}
