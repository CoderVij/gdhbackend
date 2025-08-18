import { OAuth2Client } from "google-auth-library";
import cors from "../../lib/cors";
import {users} from "../../utils/db.js";
import generateToken from "jsonwebtoken";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => (result instanceof Error ? reject(result) : resolve(result)));
  });
}

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Only POST requests allowed" });

  try {
    const { credential } = req.body; // token from Google Identity Services
    if (!credential) return res.status(400).json({ message: "No Google credential provided" });

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    let user;
    const [rows] = await users.execute("SELECT id, email, isPremium FROM users WHERE email = ?", [email]);

    if (rows.length > 0) {
      // Existing user
      user = rows[0];
    } else {
      // New user, mark as verified
      const [result] = await users.execute(
        "INSERT INTO users (email, google_id, isPremium, isVerified, auth_type) VALUES (?, ?, ?, ?, ?)",
        [email, googleId, 0, 1, "google"]
      );
      user = { id: result.insertId, email, isPremium: 0 };
    }

    // Generate JWT and set cookie
    const token = generateToken(user);
    res.setHeader(
      "Set-Cookie",
      `token=${token}; HttpOnly; Path=/; Max-Age=2592000; Secure; SameSite=None`
    );

    return res.status(200).json({ message: "Google login successful", isPremium: user.isPremium });
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(500).json({ message: "Google login failed" });
  }
}
