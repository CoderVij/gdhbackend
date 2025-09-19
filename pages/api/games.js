import { users, developers } from "../../lib/db"; // adjust path if needed
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


  if (req.method === "POST") {
    // Add new game
    try {
      const {
        developer_email,
        game_name,
        store_url_android,
        store_url_ios,
        store_url_steam,
        store_url_other,
        tagline,
        genres,
        built_with,
        platforms,
        description,
      } = req.body;

      console.log("developer email...", developer_email);
      console.log("game name...", game_name);

      if (!developer_email || !game_name) {
        return res.status(400).json({ message: "Developer email and game name are required." });
      }

      const [result] = await developers.query(
        `INSERT INTO games 
          (developer_email, game_name, store_url_android, store_url_ios, store_url_steam, store_url_other, tagline, genres, built_with, platforms, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          developer_email,
          game_name,
          store_url_android || null,
          store_url_ios || null,
          store_url_steam || null,
          store_url_other || null,
          tagline || null,
          Array.isArray(genres) ? genres.join(",") : genres || null,
          Array.isArray(built_with) ? built_with.join(",") : built_with || null,
          Array.isArray(platforms) ? platforms.join(",") : platforms || null,
          description || null,
        ]
      );

      return res.status(201).json({
        message: "Game added successfully",
        gameId: result.insertId,
      });
    } catch (error) {
      console.error("Error inserting game:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  if (req.method === "GET") {
    // Fetch games by developer email
    try {
      const { developer_email } = req.query;

      if (!developer_email) {
        return res.status(400).json({ message: "Developer email is required." });
      }

      const [rows] = await developers.query(
        "SELECT * FROM games WHERE developer_email = ? ORDER BY created_at DESC",
        [developer_email]
      );

      return res.status(200).json({ games: rows });
    } catch (error) {
      console.error("Error fetching games:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: `Method ${req.method} not allowed` });
}
