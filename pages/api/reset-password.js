import { users } from "../../lib/db";
import bcrypt from "bcryptjs";

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

  const { token, password } = req.body;

  try {
    const user = await users.findOne({ where: { reset_token: token } });
    if (!user || new Date() > user.reset_token_expiry) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await users.update(
      { password: hashedPassword, reset_token: null, reset_token_expiry: null },
      { where: { email: user.email } }
    );

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}
