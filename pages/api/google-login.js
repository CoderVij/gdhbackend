import { OAuth2Client } from "google-auth-library";
import cors from "../../lib/cors";
import { users } from "../../lib/db";
import jwt from "jsonwebtoken";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => (result instanceof Error ? reject(result) : resolve(result)));
  });
}

export default async function handler(req, res) {
  //console.log("Google login API hit"); 
  await runMiddleware(req, res, cors);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Only POST requests allowed" });

  try {
    const { credential, mode = "login" } = req.body; // Get mode from request
    if (!credential) return res.status(400).json({ message: "No Google credential provided" });

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId, picture } = payload;

    console.log(`Processing Google ${mode} for email: ${email}`);

    let user;
    const [rows] = await users.execute("SELECT id, email, isPremium FROM users WHERE email = ? OR google_id = ?", [email, googleId]);


    if (rows.length > 0) {
        // User already exists
        if (mode === "signup") {
          // Trying to signup but already registered
          return res.status(409).json({
            message: "Please login, already signed up",
            code: "ALREADY_SIGNED_UP"
          });
        }
      user = rows[0];
      console.log("Existing user found:", user.id);
      
      // Update Google ID if not set
      if (!user.google_id) {
        await users.execute("UPDATE users SET google_id = ? WHERE id = ?", [googleId, user.id]);
      }
      
    } else if (mode === "signup") {
      // New user - SIGNUP
      console.log("Creating new user for signup");
      
      // Check your actual database schema and adjust columns accordingly
      const [result] = await users.execute(
        "INSERT INTO users (email, google_id, isPremium, isVerified, auth_type) VALUES (?, ?, ?, ?, ?)",
        [email, googleId, 0, 1, "google"]
      );
      
      user = { id: result.insertId, email, isPremium: 0 };
      console.log("New user created:", user.id);
      
    } else {
      // User doesn't exist and mode is login
      
      return res.status(404).json({
        message: "Please sign up first",
        code: "SIGNUP_REQUIRED"
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        isPremium: user.isPremium 
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Set HTTP-only cookie
    res.setHeader(
      "Set-Cookie",
      `token=${token}; HttpOnly; Path=/; Max-Age=2592000; Secure; SameSite=None`
    );

    return res.status(200).json({ 
      message: `Google ${mode} successful`, 
      isPremium: user.isPremium,
      token: token,
    });

  } catch (error) {
    console.error("Google Auth Error:", error);
    console.error("Error details:", error.message);
    
    res.status(500).json({ message: `Google ${req.body.mode || 'login'} failed: ` + error.message });
  }
}