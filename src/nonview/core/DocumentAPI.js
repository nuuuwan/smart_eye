const BASE_URL = process.env.REACT_APP_API_BASE_URL || "";

/**
 * Convert a File object to a base64 string.
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // result is "data:image/jpeg;base64,XXXX" – strip the prefix
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload and analyze a document image.
 * @param {File} file
 * @returns {Promise<object>} document metadata
 */
export async function analyzeDocument(file) {
  const imageData = await fileToBase64(file);
  let response;
  try {
    response = await fetch(`${BASE_URL}/api/analyze`, {
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
      "Cannot reach backend. Run \`npm run dev\` (vercel dev) instead of \`npm start\`.",
    );
  }

  if (!response.ok) {
    const err = await response
      .json()
      .catch(() => ({ error: response.statusText }));
    throw new Error(err.error || "Failed to analyze document");
  }

  return response.json();
}

/**
 * Fetch the list of all stored documents.
 * @returns {Promise<object[]>} array of document metadata
 */
export async function listDocuments() {
  let response;
  try {
    response = await fetch(`${BASE_URL}/api/documents`);
  } catch {
    throw new Error(
      "Cannot reach backend. Run \`npm run dev\` (vercel dev) instead of \`npm start\`.",
    );
  }
  if (!response.ok) {
    const err = await response
      .json()
      .catch(() => ({ error: response.statusText }));
    throw new Error(err.error || "Failed to fetch documents");
  }
  const { documents } = await response.json();
  return documents;
}
