import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import {users} from "../../lib/db";


// Google client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { email, password, googleToken } = req.body;

  try {
    let user;

    if (googleToken) {
      //  Google login
      const ticket = await client.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const googleEmail = payload.email;

      // Find or create user
      const [rows] = await users.execute("SELECT * FROM users WHERE email = ?", [googleEmail]);
      if (rows.length > 0) {
        user = rows[0];
      } else {
        // Auto-register Google user
        const [result] = await users.execute(
          "INSERT INTO users (email, isVerified, isPremium) VALUES (?, 1, 0)",
          [googleEmail]
        );
        user = { id: result.insertId, email: googleEmail, isVerified: 1, isPremium: 0 };
      }

    } else if (email && password) {
      //  Email/password login
      const [rows] = await users.execute("SELECT * FROM users WHERE email = ?", [email]);

      if (rows.length === 0) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      user = rows[0];

      if (!user.isVerified) {
        return res.status(403).json({ message: "Please verify your email before logging in" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

    } else {
      return res.status(400).json({ message: "Missing credentials" });
    }

    //  Generate login JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, isPremium: user.isPremium },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    //  Set cookie
    res.setHeader(
      "Set-Cookie",
      `token=${token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Strict; ${
        process.env.NODE_ENV === "production" ? "Secure" : ""
      }`
    );

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        isPremium: user.isPremium,
      },
    });

  } catch (error) {
    console.error(" Login error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
}
