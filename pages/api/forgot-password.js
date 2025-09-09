import { users } from "../../lib/db";
import crypto from "crypto";
import SibApiV3Sdk from "sib-api-v3-sdk";

import cors from "../../lib/cors";


function runMiddleware(req, res, fn) {
    
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => (result instanceof Error ? reject(result) : resolve(result)));
  });
}


// Configure Brevo client
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const publicUrl = process.env.DEV_MODE === "true"
  ? "http://localhost:3000"
  : "https://gdd.freakoutgames.com";

export default async function handler(req, res) {

     await runMiddleware(req, res, cors);

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { email } = req.body;

  try {
    const user = await users.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await users.update(
      { reset_token: resetToken, reset_token_expiry: resetExpiry },
      { where: { email } }
    );

    // Email payload
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { name: "Game Developers Directory", email: "team@freakoutgames.com" };
    sendSmtpEmail.to = [{ email: user.email }];
    sendSmtpEmail.subject = "Reset your Password -GDD";
    const resetLink = `${publicUrl}/resetpassword?token=${encodeURIComponent(resetToken)}`;
    sendSmtpEmail.htmlContent =`<p>You requested a password reset. Click <a href="${resetLink}">here</a> to reset your password.</p>
             <p>This link will expire in 1 hour.</p>`;

    sendSmtpEmail.textContent = `Game Developers Directory!\n Reset your Password here: ${verificationLink}`;

    // Send email
    const response = await emailApi.sendTransacEmail(sendSmtpEmail);

    console.log(" Email sent :", response.messageId || response);
   // return { success: true, messageId: response.messageId || "no-id" };
    res.status(200).json({ message: "Password reset link sent to your email" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}
