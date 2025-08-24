import jwt from "jsonwebtoken";

import cors from "../../lib/cors";
import {users} from "../../lib/db";


// Helper: run CORS middleware
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

  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ message: "Invalid or missing token" });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    // Mark user as verified
    await users.execute("UPDATE users SET isVerified = 1 WHERE id = ?", [userId]);

    // Fetch updated user
    const [rows] = await users.execute(
      "SELECT id, email, isPremium FROM users WHERE id = ?",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];

    // Generate login token (valid 30 days)
    const loginToken = jwt.sign(
      { id: user.id, email: user.email, isPremium: user.isPremium },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    // Set login token in HTTP-only cookie
    res.setHeader(
      "Set-Cookie",
      `token=${loginToken}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Strict; ${
        process.env.NODE_ENV === "production" ? "Secure" : ""
      }`
    );

    // Redirect user to success page
    res.writeHead(302, {
      Location: `${baseUrl}/verificationsuccess`,
    });
    res.end();
  } catch (error) {
    console.error(" Verification error:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Verification link expired" });
    }

    return res.status(400).json({ message: "Invalid verification link" });
  }
}
