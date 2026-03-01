import { handleCors } from "./_lib/cors.js";
import { getConfig, setConfig } from "./_lib/blobUtils.js";

/**
 * GET  /api/config  — returns {salt, verify} or {} if first time
 * POST /api/config  — body: {salt, verify}  — stores the config
 */
export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method === "GET") {
    try {
      const config = await getConfig();
      return res.status(200).json(config || {});
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "POST") {
    try {
      const { salt, verify } = req.body;
      if (!salt || !verify)
        return res.status(400).json({ error: "salt and verify required" });
      await setConfig({ salt, verify });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
