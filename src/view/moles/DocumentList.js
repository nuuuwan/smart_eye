import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import DocumentCard from "./DocumentCard";
import { listDocuments } from "../../nonview/core/DocumentAPI";

export default function DocumentList({ newDoc }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const docs = await listDocuments();
      setDocuments(docs);
    } catch (err) {
      setError(err.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // When a new doc comes in, prepend it (de-duped by id) and refresh from server
  useEffect(() => {
    if (!newDoc) return;
    setDocuments((prev) => {
      const filtered = prev.filter((d) => d.id !== newDoc.id);
      return [newDoc, ...filtered];
    });
    // Refresh full list from server to ensure consistency
    fetchDocuments();
  }, [newDoc, fetchDocuments]);

  const filtered = documents.filter((doc) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      doc.title?.toLowerCase().includes(q) ||
      doc.author?.toLowerCase().includes(q) ||
      doc.type?.toLowerCase().includes(q) ||
      doc.date?.includes(q) ||
      doc.id?.includes(q)
    );
  });

  return (
    <Box>
      {/* Header bar */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          Stored Documents{" "}
          {documents.length > 0 && (
            <Typography component="span" variant="body2" color="text.secondary">
              ({documents.length})
            </Typography>
          )}
        </Typography>
        <Tooltip title="Refresh list">
          <span>
            <IconButton
              onClick={fetchDocuments}
              disabled={loading}
              size="small"
            >
              {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {/* Search */}
      {documents.length > 0 && (
        <TextField
          fullWidth
          size="small"
          placeholder="Filter by title, author, type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      )}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Empty state */}
      {!loading && documents.length === 0 && !error && (
        <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
          <Typography variant="body1">No documents yet.</Typography>
          <Typography variant="body2">
            Upload an image above to get started.
          </Typography>
        </Box>
      )}

      {/* No results for search */}
      {!loading && documents.length > 0 && filtered.length === 0 && (
        <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
          <Typography variant="body2">
            No documents match "{search}".
          </Typography>
        </Box>
      )}

      {/* Document cards */}
      <Stack spacing={2}>
        {filtered.map((doc) => (
          <DocumentCard key={doc.id} doc={doc} />
        ))}
      </Stack>
    </Box>
  );
}
