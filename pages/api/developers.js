import {developers} from "../../lib/db";
import cors from "../../lib/cors";


function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => (result instanceof Error ? reject(result) : resolve(result)));
  });
}

export default async function handler(req, res) {

   await runMiddleware(req, res, cors);
  try {
    let { mode, limit } = req.query;
    limit = parseInt(limit) || null;

    let sql = "SELECT id, developer_name AS name, type, role, country, gender AS avatar, created_at AS joinDate FROM developers";

    // Mode handling
    if (mode === "recent") {
      sql += " ORDER BY created_at DESC";
    } else {
      sql += " ORDER BY developer_name ASC"; // default order
    }

    // Limit handling
    if (limit) {
      sql += " LIMIT ?";
    }

    const [rows] = await developers.execute(sql, limit ? [limit] : []);

    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error("Error fetching developers:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}
