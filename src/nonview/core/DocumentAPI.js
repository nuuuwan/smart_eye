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
  const response = await fetch(`${BASE_URL}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageData,
      mimeType: file.type || "image/jpeg",
      fileName: file.name,
    }),
  });

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
  const response = await fetch(`${BASE_URL}/api/documents`);
  if (!response.ok) {
    const err = await response
      .json()
      .catch(() => ({ error: response.statusText }));
    throw new Error(err.error || "Failed to fetch documents");
  }
  const { documents } = await response.json();
  return documents;
}
