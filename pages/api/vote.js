import { developers } from "../../lib/db"; // adjust path as needed
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

  if (req.method === "GET") {
    try {
      const { user_email } = req.query;

      if (!user_email) {
        return res.status(400).json({ message: "User email is required" });
      }

      // ✅ Fetch all game IDs this user has voted for
      const [rows] = await developers.query(
        "SELECT game_id FROM game_votes WHERE user_email = ?",
        [user_email]
      );

      const votedGameIds = rows.map((row) => row.game_id);

      return res.status(200).json({ votedGameIds });
    } catch (error) {
      console.error("Error GET fetching user votes:", error);
      return res.status(500).json({ message: "Failed to fetch user votes" });
    }
  }

  if (req.method === "POST") {
    try {
      const { gameId, userEmail } = req.body;

      if (!gameId || !userEmail) {
        return res.status(400).json({ message: "Game ID and user email are required" });
      }

      // Check if already voted
      const [existing] = await developers.query(
        "SELECT id FROM game_votes WHERE game_id = ? AND user_email = ?",
        [gameId, userEmail]
      );

      if (existing.length > 0) {
        return res.status(400).json({ message: "You have already voted for this game" });
      }

      // Insert vote
      await developers.query(
        "INSERT INTO game_votes (game_id, user_email) VALUES (?, ?)",
        [gameId, userEmail]
      );

      // Increment vote count in games table
      await developers.query(
        "UPDATE games SET votes = votes + 1 WHERE id = ?",
        [gameId]
      );

      // Fetch updated total votes
      const [voteCountRows] = await developers.query(
        "SELECT votes FROM games WHERE id = ?",
        [gameId]
      );

      const totalVotes = voteCountRows[0]?.votes ?? 0;

      return res.status(200).json({
        message: "Vote recorded successfully",
        totalVotes, //  Return updated count
      });
    } catch (error) {
      console.error("Error POST casting vote:", error);
      return res.status(500).json({ message: "Failed to record vote" });
    }
  }


  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: `Method ${req.method} not allowed` });
}
