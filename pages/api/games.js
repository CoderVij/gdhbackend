import {  developers } from "../../lib/db"; // adjust path if needed
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

      //console.log("developer email...", developer_email);
      //console.log("game name...", game_name);

      if (!developer_email || !game_name) {
        return res.status(400).json({ message: "Developer email and game name are required." });
      }

      const [result] = await developers.query(
        `INSERT INTO games 
          (developer_email, developer_name, game_name, store_url_android, store_url_ios, store_url_steam, store_url_other, tagline, genres, built_with, platforms, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)`,
        [
          developer_email,
          developer_name || null,
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
      console.error("Error POST inserting game:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

    if (req.method === "GET") {
      try {
        const { developer_email } = req.query;

        let query;
        let params = [];

        if (developer_email) {
          // ✅ Fetch only this developer's games (for profile page)
          query = `
            SELECT g.*, COUNT(v.id) AS votes
            FROM games g
            LEFT JOIN game_votes v ON g.id = v.game_id
            WHERE g.developer_email = ?
            GROUP BY g.id
            ORDER BY g.created_at DESC
          `;
          params.push(developer_email);
        } else {
          // ✅ Fetch all games (for gameslist.js)
          query = `
            SELECT g.*, COUNT(v.id) AS votes
            FROM games g
            LEFT JOIN game_votes v ON g.id = v.game_id
            GROUP BY g.id
            ORDER BY votes DESC, g.created_at DESC
          `;
        }

        const [rows] = await developers.query(query, params);

        return res.status(200).json({ games: rows });
      } catch (error) {
        console.error("Error GET fetching games:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }


  if (req.method === "PUT") {
  try {
    const { id } = req.query;
    const { developer_email, ...updateData } = req.body;

    if (!id || !developer_email) {
      return res
        .status(400)
        .json({ message: "Game ID and developer email are required." });
    }

    // Check if game exists and belongs to this developer
    const [rows] = await developers.query(
      "SELECT * FROM games WHERE id = ? AND developer_email = ?",
      [id, developer_email]
    );
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Game not found or you don't have permission to edit it." });
    }

    // Build update query dynamically
    const fields = Object.keys(updateData)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = Object.values(updateData);

    if (fields.length > 0) {
      await developers.query(
        `UPDATE games SET ${fields} WHERE id = ? AND developer_email = ?`,
        [...values, id, developer_email]
      );
    }

    return res.status(200).json({ message: "Game updated successfully" });
  } catch (error) {
    console.error("Error PUT updating game:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

if (req.method === "DELETE") {
  try {
    const { id, developer_email } = req.query;

    if (!id || !developer_email) {
      return res
        .status(400)
        .json({ message: "Game ID and developer email are required." });
    }

    const [rows] = await developers.query(
      "SELECT * FROM games WHERE id = ? AND developer_email = ?",
      [id, developer_email]
    );
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Game not found or you don't have permission to delete it." });
    }

    await developers.query("DELETE FROM games WHERE id = ? AND developer_email = ?", [
      id,
      developer_email,
    ]);

    return res.status(200).json({ message: "Game deleted successfully" });
  } catch (error) {
    console.error("Error DELETE removing game:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}


  res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
  return res.status(405).json({ message: `Method ${req.method} not allowed` });
}
