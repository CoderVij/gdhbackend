import bcrypt from "bcryptjs";
import sendVerificationEmail from "./sendVerificationEmail";
import cors from "../../lib/cors";
import {users} from "../../lib/db";

/*
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_USER_PASSWORD,
  database: process.env.DB_USER_NAME,
});
*/

// Helper to run CORS
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => (result instanceof Error ? reject(result) : resolve(result)));
  });
}

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Only POST requests are allowed." });

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

  try {
    //  Check if user already exists
    const [existingUser] = await users.execute("SELECT id, isVerified FROM users WHERE email = ?", [email]);

    if (existingUser.length > 0) {
      if (existingUser[0].isVerified) {
        return res.status(409).json({ message: "This email is already registered. Please log in." });
      } else {
        return res.status(409).json({ message: "This email is registered but not verified. Please check your email." });
      }
    }

    //  Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    //  Insert new user into DB
    const [result] = await users.execute(
      "INSERT INTO users (email, password, isPremium, isVerified, google_id, auth_type) VALUES (?, ?, ?, ?, ?, ?)",
      [email, hashedPassword, 0, 0, null, "email"]
    );

    const user = { id: result.insertId, email, isPremium: 0 };

    //  Send verification email (with timeout safety)
    const emailPromise = sendVerificationEmail(user);
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Email sending timed out")), 9000)
    );

    try {
      const emailResult = await Promise.race([emailPromise, timeout]);

      if (!emailResult.success) {
        console.error(" Email failed to send:", emailResult.error);
      } else {
        console.log(" Email sent successfully:", emailResult.messageId);
      }
    } catch (err) {
      console.error(" Email send error or timeout:", err.message);
    }

    //  Respond to frontend
    res.status(201).json({
      message: "Signup successful! Please check your email to verify your account.",
    });
  } catch (error) {
    console.error(" Error in registering user:", error);
    res.status(500).json({ message: "Error registering user", error: error.message });
  }
}
