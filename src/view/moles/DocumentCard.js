import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Collapse,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CodeIcon from "@mui/icons-material/Code";
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

export default function DocumentCard({ doc }) {
  const [expanded, setExpanded] = useState(false);
  const color = TYPE_COLORS[doc.type?.toLowerCase()] ?? "default";

  const formattedDate = doc.date
    ? new Date(doc.date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const analyzedDate = doc.analyzedAt
    ? new Date(doc.analyzedAt).toLocaleString()
    : null;

  return (
    <Card
      elevation={2}
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        transition: "box-shadow 0.2s",
        "&:hover": { boxShadow: 6 },
      }}
    >
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" } }}>
        {/* Thumbnail */}
        {doc.imageUrl && (
          <Box
            sx={{
              width: { xs: "100%", sm: 160 },
              minHeight: { xs: 120, sm: "auto" },
              flexShrink: 0,
              bgcolor: "grey.100",
              position: "relative",
            }}
          >
            <CardMedia
              component="img"
              image={doc.imageUrl}
              alt={doc.title || "Document"}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                minHeight: 120,
              }}
            />
            <Tooltip title="View full image">
              <IconButton
                size="small"
                component="a"
                href={doc.imageUrl}
                target="_blank"
                rel="noopener"
                sx={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  bgcolor: "rgba(255,255,255,0.85)",
                  "&:hover": { bgcolor: "white" },
                }}
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Content */}
        <CardContent sx={{ flex: 1, p: 2, "&:last-child": { pb: 2 } }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="flex-start"
            flexWrap="wrap"
          >
            <Chip
              label={doc.type || "unknown"}
              color={color}
              size="small"
              variant="outlined"
              sx={{ textTransform: "capitalize", mb: 0.5 }}
            />
          </Stack>

          <Typography variant="h6" sx={{ mt: 0.5, mb: 0.25, lineHeight: 1.3 }}>
            {doc.title || <em style={{ color: "#9e9e9e" }}>Untitled</em>}
          </Typography>

          <Stack direction="row" spacing={2} sx={{ mb: 1 }} flexWrap="wrap">
            {doc.author && (
              <Typography variant="caption" color="text.secondary">
                <strong>By:</strong> {doc.author}
              </Typography>
            )}
            {formattedDate && (
              <Typography variant="caption" color="text.secondary">
                <strong>Date:</strong> {formattedDate}
              </Typography>
            )}
          </Stack>

          {analyzedDate && (
            <Typography
              variant="caption"
              color="text.disabled"
              display="block"
              sx={{ mb: 1 }}
            >
              Analyzed {analyzedDate}
            </Typography>
          )}

          <Stack direction="row" alignItems="center" spacing={1}>
            <Tooltip title="Show extracted data">
              <IconButton
                size="small"
                onClick={() => setExpanded((v) => !v)}
                sx={{
                  transform: expanded ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s",
                }}
              >
                <ExpandMoreIcon />
              </IconButton>
            </Tooltip>
            <Typography variant="caption" color="text.secondary">
              {expanded ? "Hide" : "Show"} extracted data
            </Typography>
            {doc.metadataUrl && (
              <Tooltip title="View raw JSON">
                <IconButton
                  size="small"
                  component="a"
                  href={doc.metadataUrl}
                  target="_blank"
                  rel="noopener"
                >
                  <CodeIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>

          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Divider sx={{ my: 1 }} />
            <Typography
              variant="overline"
              display="block"
              color="text.secondary"
              sx={{ mb: 0.5 }}
            >
              Extracted Content
            </Typography>
            <JSONView data={doc.data} />
          </Collapse>
        </CardContent>
      </Box>

      {/* ID footer */}
      <Box
        sx={{
          bgcolor: "grey.50",
          px: 2,
          py: 0.5,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ fontFamily: "monospace" }}
        >
          ID: {doc.id}
        </Typography>
      </Box>
    </Card>
  );
}
