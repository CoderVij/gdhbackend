// sendVerificationEmail.js
import jwt from "jsonwebtoken";
import SibApiV3Sdk from "sib-api-v3-sdk";

// Configure Brevo client
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

export default async function sendVerificationEmail(user) {
  try {
    if (!user?.email) {
      throw new Error("User email is missing");
    }

    // Create verification token (valid 24h)
    const token = jwt.sign(
      { id: user.id, email: user.email, isPremium: user.isPremium },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Build verification link
    const verificationLink =
      process.env.DEV_MODE === "true"
        ? `http://localhost:3000/api/verify?token=${token}`
        : `https://gdhbackend.vercel.app/api/verify?token=${token}`;

    // Email payload
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { name: "Game Developers Hub", email: "team@freakoutgames.com" };
    sendSmtpEmail.to = [{ email: user.email }];
    sendSmtpEmail.subject = "Verify Your Email - GDH";
    sendSmtpEmail.htmlContent = `
      <h2>Welcome to Game Developers Hub!</h2>
      <p>Click the button below to verify your email and access your dashboard:</p>
      <a href="${verificationLink}" 
         style="display:inline-block;padding:10px 20px;color:white;background:#007bff;
         text-decoration:none;border-radius:5px;">Verify Email</a>
      <p>If you didn't sign up, please ignore this email.</p>
    `;
    sendSmtpEmail.textContent = `Welcome to Game Developers Hub!\nVerify your email here: ${verificationLink}`;

    // Send email
    const response = await emailApi.sendTransacEmail(sendSmtpEmail);

    console.log(" Email sent :", response.messageId || response);
    return { success: true, messageId: response.messageId || "no-id" };

  } catch (error) {
    console.error(" sendVerificationEmail error:", error.response?.text || error.message);
    return { success: false, error: error.message };
  }
}
