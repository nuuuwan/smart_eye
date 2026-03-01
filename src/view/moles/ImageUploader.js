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
  const [isDragging, setIsDragging] = useState(false);
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

  // Drag-and-drop handlers
  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };
  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  return (
    <Box>
      {/* Drop zone */}
      <Box
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => status === "idle" && fileInputRef.current?.click()}
        sx={{
          border: "2px dashed",
          borderColor: isDragging ? "primary.main" : "divider",
          borderRadius: 3,
          p: 5,
          textAlign: "center",
          cursor: status === "idle" ? "pointer" : "default",
          bgcolor: isDragging ? "primary.50" : "grey.50",
          transition: "all 0.2s ease",
          "&:hover":
            status === "idle"
              ? { borderColor: "primary.main", bgcolor: "primary.50" }
              : {},
          position: "relative",
          overflow: "hidden",
        }}
      >
        {status === "uploading" ? (
          <Box>
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
          <Box>
            <CloudUploadIcon
              sx={{ fontSize: 48, color: "primary.light", mb: 1 }}
            />
            <Typography variant="h6" gutterBottom>
              Drop document here
            </Typography>
            <Typography variant="body2" color="text.secondary">
              or click to browse — JPEG, PNG, WebP, TIFF, GIF accepted
            </Typography>
          </Box>
        )}
      </Box>

      {/* Error */}
      {status === "error" && (
        <Alert
          severity="error"
          sx={{ mt: 2 }}
          onClose={() => setStatus("idle")}
        >
          {errorMsg}
        </Alert>
      )}

      {/* Action buttons */}
      <Box sx={{ display: "flex", gap: 2, mt: 2, justifyContent: "center" }}>
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={() => fileInputRef.current?.click()}
          disabled={status === "uploading"}
        >
          Upload File
        </Button>
        <Button
          variant="outlined"
          startIcon={<CameraAltIcon />}
          onClick={() => cameraInputRef.current?.click()}
          disabled={status === "uploading"}
        >
          Take Photo
        </Button>
      </Box>

      {/* Hidden file inputs */}
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
        capture="environment"
        onChange={onFileChange}
        style={{ display: "none" }}
      />
    </Box>
  );
}
