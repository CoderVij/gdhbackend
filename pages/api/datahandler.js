import {developers,users} from "../../lib/db";
import cors from "../../lib/cors";
import jwt from "jsonwebtoken";

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => (result instanceof Error ? reject(result) : resolve(result)));
  });
}

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  //  Extract user from JWT (from cookie or header)
  let userEmail;
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userEmail = decoded.email;
  } catch (err) {
    console.error("JWT error:", err.message);
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }

  if (req.method === "GET") {
    try {
      const [rows] = await users.query("SELECT * FROM developers WHERE email = ?", [userEmail]);

      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: "No profile found for this user" });
      }

      return res.status(200).json({ success: true, data: rows[0] });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Database error" });
    }
  }

  if (req.method === "POST") {
    try {
      const {
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
      } = req.body;

      const query = `
        INSERT INTO developers 
        (developer_name, type, role, country, city, email, portfolio, gender,
         social_x, linkedin, discord, instagram, facebook, twitch, youtube)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          developer_name=VALUES(developer_name),
          type=VALUES(type),
          role=VALUES(role),
          country=VALUES(country),
          city=VALUES(city),
          portfolio=VALUES(portfolio),
          gender=VALUES(gender),
          social_x=VALUES(social_x),
          linkedin=VALUES(linkedin),
          discord=VALUES(discord),
          instagram=VALUES(instagram),
          facebook=VALUES(facebook),
          twitch=VALUES(twitch),
          youtube=VALUES(youtube)
      `;

      const values = [
        developer_name,
        type,
        role,
        country,
        city,
        userEmail, //  comes from JWT, not frontend
        portfolio,
        gender,
        social_x || null,
        linkedin || null,
        discord || null,
        instagram || null,
        facebook || null,
        twitch || null,
        youtube || null,
      ];

      const [result] = await developers.query(query, values);
      return res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Insert/Update failed" });
    }
  }

  return res.status(405).json({ success: false, message: "Method not allowed" });
}
