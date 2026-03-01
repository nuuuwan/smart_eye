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
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import { analyzeDocument } from "../../nonview/core/DocumentAPI";

const ACCEPTED =
  "image/jpeg,image/png,image/webp,image/gif,image/bmp,image/tiff";

export default function ImageUploader({ onDocumentAnalyzed }) {
  const [status, setStatus] = useState("idle"); // idle | uploading | error
  const [errorMsg, setErrorMsg] = useState("");
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef();
  const cameraInputRef = useRef();

  const processFile = useCallback(
    async (file) => {
      if (!file) return;
      setStatus("uploading");
      setErrorMsg("");
      setPreview(URL.createObjectURL(file));

      try {
        const result = await analyzeDocument(file);
        setStatus("idle");
        setPreview(null);
        onDocumentAnalyzed?.(result);
      } catch (err) {
        setStatus("error");
        setErrorMsg(err.message || "Analysis failed");
      }
    },
    [onDocumentAnalyzed],
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
            Analyzing document with AI…
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
            Upload File
          </Button>
          <Button
            variant="outlined"
            startIcon={<CameraAltIcon />}
            onClick={() => cameraInputRef.current?.click()}
          >
            Take Photo
          </Button>
        </Box>
      )}

      {status === "error" && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setStatus("idle")}>
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
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
    </Box>
  );
}
