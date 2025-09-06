import { developers } from "../../lib/db";
import cors from "../../lib/cors";


function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => (result instanceof Error ? reject(result) : resolve(result)));
  });
}


export default async function handler(req, res) {

    await runMiddleware(req, res, cors);
  try {
    let { mode = "all", limit, page, country } = req.query;
    limit = parseInt(limit) || null;
    page = parseInt(page) || 1;

    let sql = `
      SELECT *
      FROM developers
    `;
    let conditions = [];
    let values = [];

    // Filter by country if provided
    if (country) {
      conditions.push("country = ?");
      values.push(country);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    if (mode === "recent") {
      sql += " ORDER BY created_at DESC";
    } else {
      sql += " ORDER BY developer_name ASC";
    }

    if (limit) {
      const offset = (page - 1) * limit;
      sql += " LIMIT ? OFFSET ?";
      values.push(limit, offset);
    }

    const [rows] = await developers.execute(sql, values);

    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error("Error fetching developers:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}
