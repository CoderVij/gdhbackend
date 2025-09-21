import {  developers } from "../../lib/db"; 
import cors from "../../lib/cors";


function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => (result instanceof Error ? reject(result) : resolve(result)));
  });
}


export default async function handler(req, res) {
     await runMiddleware(req, res, cors);
     
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { gameId, userEmail } = req.body;

    if (!gameId || !userEmail) {
      return res.status(400).json({ message: "Game ID and user email are required." });
    }

    // Check if already voted
    const [existing] = await developers.query(
      "SELECT * FROM game_votes WHERE game_id = ? AND user_email = ?",
      [gameId, userEmail]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "You have already voted for this game." });
    }

    // Insert vote
    await developers.query(
      "INSERT INTO game_votes (game_id, user_email) VALUES (?, ?)",
      [gameId, userEmail]
    );

    // Increment game's vote count
    await developers.query("UPDATE games SET votes = votes + 1 WHERE id = ?", [gameId]);

    return res.status(200).json({ message: "Vote recorded successfully" });
  } catch (error) {
    console.error("Error recording vote:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
