import { users } from "../../lib/db";
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

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // Fetch developer profile by email
    const [rows] = await users.execute(
      "SELECT * FROM developers WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const hasProfile = rows.length > 0;

    return res.status(200).json({
      message: "Profile fetched successfully",
      profile: rows[0],
      hasProfile:true
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
