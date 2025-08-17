import pool from "@/lib/db";
import cors from '@/lib/cors';



export default async function handler(req, res) {

  await runMiddleware(req, res, cors);
  
  if (req.method === "OPTIONS") 
  {
    res.status(200).end();
    return true;
  }

  if (req.method === "GET") {
    try {
      const [rows] = await pool.query("SELECT * FROM developers");
      return res.status(200).json({ success: true, data: rows });
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
        email,
        portfolio,
        gender,
        social_x,
        linkedin,
        discord,
        instagram,
        facebook,
        twitch,
        youtube
      } = req.body;

      const query = `
        INSERT INTO developers 
        (developer_name, type, role, country, city, email, portfolio, gender,
         social_x, linkedin, discord, instagram, facebook, twitch, youtube)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        developer_name,
        type,
        role,
        country,
        city,
        email,
        portfolio,
        gender,
        social_x || null,
        linkedin || null,
        discord || null,
        instagram || null,
        facebook || null,
        twitch || null,
        youtube || null
      ];

      const [result] = await pool.query(query, values);
      return res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Insert failed" });
    }
  }

  return res.status(405).json({ success: false, message: "Method not allowed" });
}
