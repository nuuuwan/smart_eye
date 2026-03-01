import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { useCryptoKey } from "../../nonview/core/CryptoContext";
import { listAndDecryptDocuments } from "../../nonview/core/DocumentAPI";
import { decryptImageToObjectURL } from "../../nonview/core/CryptoUtils";
import JSONView from "../atoms/JSONView";

const TYPE_COLORS = {
  invoice: "warning",
  receipt: "warning",
  letter: "info",
  report: "primary",
  contract: "error",
  article: "success",
  form: "secondary",
  certificate: "success",
  unknown: "default",
};

function DecryptedFullImage({
  imageUrl,
  mimeType = "image/jpeg",
  alt = "Document",
}) {
  const cryptoKey = useCryptoKey();
  const [objectUrl, setObjectUrl] = useState(null);

  useEffect(() => {
    if (!imageUrl || !cryptoKey) return;
    let revoked = false;
    (async () => {
      try {
        const encB64 = await fetch(imageUrl).then((r) => r.text());
        const url = await decryptImageToObjectURL(cryptoKey, encB64, mimeType);
        if (!revoked) setObjectUrl(url);
      } catch {
        // leave null
      }
    })();
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, cryptoKey]);

  if (!objectUrl) {
    return (
      <Skeleton
        variant="rectangular"
        width="100%"
        height={300}
        sx={{ borderRadius: 2 }}
      />
    );
  }

  return (
    <Box
      component="img"
      src={objectUrl}
      alt={alt}
      sx={{
        width: "100%",
        maxHeight: 480,
        objectFit: "contain",
        borderRadius: 2,
        bgcolor: "grey.100",
      }}
    />
  );
}

export default function DocumentPage({ onSignOut }) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const cryptoKey = useCryptoKey();

  // Use doc passed via router state (navigated from list) or fetch by ID
  const [doc, setDoc] = useState(location.state?.doc ?? null);
  const [loading, setLoading] = useState(!doc);
  const [error, setError] = useState("");

  useEffect(() => {
    if (doc) return; // already have it from state
    setLoading(true);
    listAndDecryptDocuments(cryptoKey)
      .then((docs) => {
        const found = docs.find((d) => d.id === id);
        if (found) {
          setDoc(found);
        } else {
          setError("Document not found.");
        }
      })
      .catch((err) => setError(err.message || "Failed to load document."))
      .finally(() => setLoading(false));
  }, [id, cryptoKey, doc]);

  const color = TYPE_COLORS[doc?.type?.toLowerCase()] ?? "default";
  const formattedDate = doc?.date
    ? new Date(doc.date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  const analyzedDate = doc?.analyzedAt
    ? new Date(doc.analyzedAt).toLocaleString()
    : null;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", pb: 6, pt: 4 }}>
      <Container maxWidth="md">
        {/* Top bar */}
        <Stack direction="row" alignItems="center" sx={{ mb: 3 }} spacing={1}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/docs")}
            variant="text"
            sx={{ textTransform: "none" }}
          >
            Back to Documents
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<LockOpenIcon />}
            onClick={onSignOut}
            sx={{ borderRadius: 2, textTransform: "none" }}
          >
            Sign Out
          </Button>
        </Stack>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {doc && (
          <Paper elevation={2} sx={{ borderRadius: 3, overflow: "hidden" }}>
            {/* Image */}
            {doc.imageUrl && (
              <Box sx={{ p: 2, bgcolor: "grey.100" }}>
                <DecryptedFullImage
                  imageUrl={doc.imageUrl}
                  mimeType={doc.mimeType || "image/jpeg"}
                  alt={doc.title || "Document"}
                />
              </Box>
            )}

            <Box sx={{ p: 3 }}>
              {/* Type chip */}
              <Chip
                label={doc.type || "unknown"}
                color={color}
                size="small"
                variant="outlined"
                sx={{ textTransform: "capitalize", mb: 1.5 }}
              />

              {/* Title */}
              <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
                {doc.title || <em style={{ color: "#9e9e9e" }}>Untitled</em>}
              </Typography>

              {/* Meta */}
              <Stack direction="row" spacing={3} flexWrap="wrap" sx={{ mb: 2 }}>
                {doc.author && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Author:</strong> {doc.author}
                  </Typography>
                )}
                {formattedDate && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Date:</strong> {formattedDate}
                  </Typography>
                )}
                {doc.fileName && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>File:</strong> {doc.fileName}
                  </Typography>
                )}
              </Stack>

              {analyzedDate && (
                <Typography
                  variant="caption"
                  color="text.disabled"
                  display="block"
                  sx={{ mb: 2 }}
                >
                  Analyzed {analyzedDate}
                </Typography>
              )}

              <Divider sx={{ mb: 2 }} />

              {/* Extracted data */}
              <Typography
                variant="overline"
                color="text.secondary"
                display="block"
                sx={{ mb: 1 }}
              >
                Extracted Content
              </Typography>
              <JSONView data={doc.data} />

              <Divider sx={{ mt: 2, mb: 1 }} />
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ fontFamily: "monospace" }}
              >
                ID: {doc.id}
              </Typography>
            </Box>
          </Paper>
        )}
      </Container>
    </Box>
  );
}
