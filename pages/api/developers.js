import {developers} from "../../lib/db";
import cors from "../../lib/cors";


function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => (result instanceof Error ? reject(result) : resolve(result)));
  });
}

//mode can be 'recent', 'all'

export default async function handler(req, res) 
{
    await runMiddleware(req, res, cors);
  try {
    let { mode = "all", limit = 10, page = 1 } = req.query;
    limit = parseInt(limit);
    page = parseInt(page);

    const offset = (page - 1) * limit;

    let sql = `
      SELECT *
      FROM developers
    `;

    // Sort mode
    if (mode === "recent") {
      sql += " ORDER BY created_at DESC";
    } else {
      sql += " ORDER BY developer_name ASC";
    }

    // Pagination
    sql += " LIMIT ? OFFSET ?";

    const [rows] = await developers.execute(sql, [limit, offset]);

    // Get total developers (for frontend to calculate total pages)
    const [totalRows] = await developers.execute("SELECT COUNT(*) AS total FROM developers");

    res.status(200).json({
      success: true,
      data: rows,
      total: totalRows[0].total,
      page,
      totalPages: Math.ceil(totalRows[0].total / limit),
    });
  } catch (err) {
    console.error("Error fetching developers:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}