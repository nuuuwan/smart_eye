import { Box, Chip, Tooltip, Typography } from "@mui/material";

/**
 * Recursively renders a JSON value in a readable, structured way.
 */
function JSONValue({ value, depth = 0 }) {
  if (value === null || value === undefined) {
    return <span style={{ color: "#9e9e9e", fontStyle: "italic" }}>null</span>;
  }

  if (typeof value === "boolean") {
    return (
      <Chip
        label={value ? "true" : "false"}
        size="small"
        color={value ? "success" : "default"}
        variant="outlined"
        sx={{ fontSize: "0.7rem", height: 20 }}
      />
    );
  }

  if (typeof value !== "object") {
    return <span style={{ color: "#1a237e" }}>{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span style={{ color: "#9e9e9e" }}>[]</span>;
    return (
      <Box sx={{ pl: depth > 0 ? 2 : 0 }}>
        {value.map((item, i) => (
          <Box key={i} sx={{ display: "flex", gap: 1, mb: 0.5 }}>
            <Typography
              variant="caption"
              sx={{ color: "#9e9e9e", minWidth: 16 }}
            >
              {i}.
            </Typography>
            <JSONValue value={item} depth={depth + 1} />
          </Box>
        ))}
      </Box>
    );
  }

  // Object
  const entries = Object.entries(value);
  if (entries.length === 0)
    return <span style={{ color: "#9e9e9e" }}>{"{}"}</span>;

  return (
    <Box sx={{ pl: depth > 0 ? 2 : 0 }}>
      {entries.map(([k, v]) => (
        <Box
          key={k}
          sx={{ display: "flex", gap: 1, mb: 0.75, alignItems: "flex-start" }}
        >
          <Tooltip title={k}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: "#5c6bc0",
                minWidth: 120,
                maxWidth: 160,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                pt: 0.1,
                flexShrink: 0,
              }}
            >
              {k}
            </Typography>
          </Tooltip>
          <Box sx={{ flex: 1, wordBreak: "break-word" }}>
            <JSONValue value={v} depth={depth + 1} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export default function JSONView({ data }) {
  return (
    <Box
      sx={{
        fontFamily: '"Roboto Mono", "Courier New", monospace',
        fontSize: "0.8rem",
        bgcolor: "#f5f5f5",
        borderRadius: 1,
        p: 1.5,
        overflow: "auto",
        maxHeight: 400,
      }}
    >
      <JSONValue value={data} depth={0} />
    </Box>
  );
}
