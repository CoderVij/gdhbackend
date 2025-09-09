import {users} from "../../lib/db";
import bcrypt from "bcryptjs";
import cors from "../../lib/cors";

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) =>
      result instanceof Error ? reject(result) : resolve(result)
    );
  });
}

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: "Missing token or password" });
  }

  try {
    // 1. Look up user by token
    const [rows] = await users.query(
      "SELECT email, reset_token_expiry FROM users WHERE reset_token = ?",
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid reset token" });
    }

    const user = rows[0];

    if (new Date() > new Date(user.reset_token_expiry)) {
      return res.status(400).json({ message: "Reset token expired" });
    }

    // 2. Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Update password and clear token
    await users.query(
      "UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE email = ?",
      [hashedPassword, user.email]
    );

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}
