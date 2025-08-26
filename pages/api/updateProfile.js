import  {users}  from "../../lib/db";

import cors from "../../lib/cors";


function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => (result instanceof Error ? reject(result) : resolve(result)));
  });
}

export default async function handler(req, res) {

  await runMiddleware(req, res, cors);

  if (req.method === "OPTIONS") {
    return res.status(200).end(); 
  }

  if (req.method !== "PUT") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const {
      developer_name,
      type,
      role,
      country,
      city,
      email,
      portfolio,
      gender,
      social_x,
      linkedin,
      discord,
      instagram,
      facebook,
      twitch,
      youtube,
    } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const [result] = await users.execute(
      `UPDATE developers SET 
        developer_name = ?, 
        type = ?, 
        role = ?, 
        country = ?, 
        city = ?, 
        portfolio = ?, 
        gender = ?, 
        social_x = ?, 
        linkedin = ?, 
        discord = ?, 
        instagram = ?, 
        facebook = ?, 
        twitch = ?, 
        youtube = ?
       WHERE email = ?`,
      [
        developer_name,
        type,
        role,
        country,
        city,
        portfolio,
        gender,
        social_x,
        linkedin,
        discord,
        instagram,
        facebook,
        twitch,
        youtube,
        email,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    return res.status(200).json({ success: true, message: "Profile updated successfully" });
  } catch (err) {
    console.error("Update profile error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
