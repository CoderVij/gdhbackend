import { users } from "../../lib/db";
import cors from "../../lib/cors";

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => (result instanceof Error ? reject(result) : resolve(result)));
  });
}


export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { category } = req.query;

    // Fetch ads from DB (filter by category if provided)
    let query = "SELECT id, title, destination_url, image_path FROM ads";
    const params = [];

    if (category) {
      query += " WHERE category = ?";
      params.push(category);
    }

    const [rows] = await users.execute(query, params);

    // Return ads in clean JSON format
    const ads = rows.map((row) => ({
      id:row.id,
      title: row.title,
      url: row.destination_url,
      image: row.image_path,
    }));

    res.status(200).json({ ads });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}
