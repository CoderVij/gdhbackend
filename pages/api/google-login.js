import { OAuth2Client } from "google-auth-library";
import cors from "../../lib/cors";
import { users } from "../../lib/db";
import jwt from "jsonwebtoken"; // Fixed import - use 'jwt' not 'generateToken'

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => (result instanceof Error ? reject(result) : resolve(result)));
  });
}

export default async function handler(req, res) {
  console.log("Google login API hit"); 
  await runMiddleware(req, res, cors);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Only POST requests allowed" });

  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: "No Google credential provided" });

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId, picture } = payload;

    let user;
    const [rows] = await users.execute("SELECT id, email, isPremium FROM users WHERE email = ?", [email]);

    if (rows.length > 0) {
      // Existing user
      user = rows[0];
    } else {
      // New user, mark as verified
      const [result] = await users.execute(
        "INSERT INTO users (email, google_id, username, profile_picture, isPremium, isVerified, auth_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [email, googleId, name || email.split('@')[0], picture, 0, 1, "google"]
      );
      user = { id: result.insertId, email, isPremium: 0 };
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        isPremium: user.isPremium 
      },
      process.env.JWT_SECRET, // Make sure this env variable is set
      { expiresIn: '30d' }
    );

    // Set HTTP-only cookie
    res.setHeader(
      "Set-Cookie",
      `token=${token}; HttpOnly; Path=/; Max-Age=2592000; Secure; SameSite=None`
    );

    return res.status(200).json({ 
      message: "Google login successful", 
      isPremium: user.isPremium,
      token: token // Also return token in response for frontend
    });

  } catch (error) {
    console.error("Google Auth Error:", error);
    console.error("Error details:", error.message, error.stack);
    
    // More specific error messages
    if (error.message.includes("JWT_SECRET")) {
      return res.status(500).json({ message: "Server configuration error" });
    }
    
    res.status(500).json({ message: "Google login failed: " + error.message });
  }
}