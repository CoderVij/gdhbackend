import { developers } from "../../lib/db";
import cors from "../../lib/cors";


function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => (result instanceof Error ? reject(result) : resolve(result)));
  });
}

export default async function handler(req, res)
 {
    await runMiddleware(req, res, cors);

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ message: "Developer ID is required" });
  }

  try {
    const [rows] = await developers.execute(
      "SELECT * FROM developers WHERE id = ? LIMIT 1",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Developer not found" });
    }
    return res.status(200).json({ profile: rows[0] });
  } catch (err) {
    console.error("Error fetching developer:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
