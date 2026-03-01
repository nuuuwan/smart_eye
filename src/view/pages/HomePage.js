import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Snackbar,
  Typography,
} from "@mui/material";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import ImageUploader from "../moles/ImageUploader";
import DocumentList from "../moles/DocumentList";

export default function HomePage({ onSignOut }) {
  const [newDoc, setNewDoc] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleDocumentAnalyzed = (doc) => {
    setNewDoc(doc);
    setSnackbar({
      open: true,
      message: doc.cached
        ? `Document already stored: "${doc.title || doc.id}"`
        : `Document analyzed and stored: "${doc.title || doc.id}"`,
      severity: "success",
    });
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", pb: 6, pt: 4 }}>
      <Container maxWidth="md">
        {/* Upload section */}
        <Paper elevation={2} sx={{ borderRadius: 3, p: 3, mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <Typography variant="h6" sx={{ flex: 1 }}>
              Scan or Upload a Document
            </Typography>
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
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload a photo or scan of any document. The AI will extract all
            information and store it automatically.
          </Typography>
          <ImageUploader onDocumentAnalyzed={handleDocumentAnalyzed} />
        </Paper>

        <Divider sx={{ mb: 4 }} />

        {/* Document list */}
        <DocumentList newDoc={newDoc} />
      </Container>

      {/* Success / info snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          elevation={6}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
