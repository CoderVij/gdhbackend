import {users} from "../../lib/db";
import crypto from "crypto";
import SibApiV3Sdk from "sib-api-v3-sdk";
import cors from "../../lib/cors";

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) =>
      result instanceof Error ? reject(result) : resolve(result)
    );
  });
}

// Configure Brevo (Sendinblue) client
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const publicUrl =
  process.env.DEV_MODE === "true"
    ? "http://localhost:3000"
    : "https://gdd.freakoutgames.com";

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
    // 1. Check if user exists
    const [rows] = await users.query("SELECT email FROM users WHERE email = ?", [
      email,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    // 2. Generate token and expiry
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // 3. Update DB with token + expiry
    await users.query(
      "UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?",
      [resetToken, resetExpiry, email]
    );

    // 4. Send email
    const resetLink = `${publicUrl}/resetpassword?token=${encodeURIComponent(
      resetToken
    )}`;

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = {
      name: "Game Developers Directory",
      email: "team@freakoutgames.com",
    };
    sendSmtpEmail.to = [{ email }];
    sendSmtpEmail.subject = "Reset your Password - GDD";
    sendSmtpEmail.htmlContent = `
      <p>You requested a password reset.</p>
      <p>Click <a href="${resetLink}">here</a> to reset your password.</p>
      <p>This link will expire in 1 hour.</p>
    `;
    sendSmtpEmail.textContent = `Reset your password: ${resetLink}`;

    const response = await emailApi.sendTransacEmail(sendSmtpEmail);
    console.log("Password reset email sent:", response.messageId || response);

    res.status(200).json({ message: "Password reset link sent to your email" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}
