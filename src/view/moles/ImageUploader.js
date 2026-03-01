import { useCallback, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Typography,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useCryptoKey } from "../../nonview/core/CryptoContext";
import { processDocument } from "../../nonview/core/DocumentAPI";

const ACCEPTED =
  "image/jpeg,image/png,image/webp,image/gif,image/bmp,image/tiff,image/heic,image/heif";

const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/tiff",
  "image/heic",
  "image/heif",
]);

export default function ImageUploader({ onDocumentAnalyzed }) {
  const cryptoKey = useCryptoKey();
  const [status, setStatus] = useState("idle"); // idle | uploading | error
  const [errorMsg, setErrorMsg] = useState("");
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef();

  const processFile = useCallback(
    async (file) => {
      if (!file) return;

      if (!ACCEPTED_TYPES.has(file.type)) {
        setStatus("error");
        setErrorMsg(
          `"${file.name}" is not a supported file type. Please upload a photo or image of a document (JPEG, PNG, WEBP, etc.).`,
        );
        return;
      }

      setStatus("uploading");
      setErrorMsg("");
      setPreview(URL.createObjectURL(file));

      try {
        const result = await processDocument(file, cryptoKey);
        setStatus("idle");
        setPreview(null);
        onDocumentAnalyzed?.(result);
      } catch (err) {
        setStatus("error");
        setErrorMsg(err.message || "Analysis failed");
      }
    },
    [onDocumentAnalyzed, cryptoKey],
  );

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  return (
    <Box>
      {status === "uploading" ? (
        <Box sx={{ textAlign: "center", py: 2 }}>
          {preview && (
            <Box
              component="img"
              src={preview}
              alt="uploading"
              sx={{
                maxHeight: 160,
                maxWidth: "100%",
                borderRadius: 2,
                mb: 2,
                objectFit: "contain",
              }}
            />
          )}
          <CircularProgress size={32} sx={{ mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            Analyzing &amp; encrypting document…
          </Typography>
          <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />
        </Box>
      ) : (
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={() => fileInputRef.current?.click()}
          >
            Add Photo
          </Button>
        </Box>
      )}

      {status === "error" && (
        <Alert
          severity="error"
          sx={{ mt: 2 }}
          onClose={() => setStatus("idle")}
        >
          {errorMsg}
        </Alert>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED}
        onChange={onFileChange}
        style={{ display: "none" }}
      />
    </Box>
  );
}
