import formidable from "formidable";
import fs from "fs";
import fetch from "node-fetch";
import { users } from "../../lib/db";
import cors from "../../lib/cors";

export const config = {
  api: {
    bodyParser: false,
  },
};

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) =>
      result instanceof Error ? reject(result) : resolve(result)
    );
  });
}

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // ------------------ GET ALL ADS + USER DATA ------------------
    if (req.method === "GET") {
      const { email } = req.query;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // 1. Fetch user details
      const [userRows] = await users.query(
        "SELECT id, isPremium FROM users WHERE email = ?",
        [email]
      );

      if (!userRows.length) {
        return res.status(404).json({ error: "User not found" });
      }

      const user = userRows[0];

      // 2. Fetch ads
      const [ads] = await users.query(
        `SELECT ads.id, ads.title, ads.description, ads.destination_url, ads.category, ads.image_path, users.email
         FROM ads
         JOIN users ON ads.user_id = users.id
         ORDER BY ads.id DESC`
      );

      console.log("user....", user);
      return res.status(200).json({
        user: {
          id: user.id,
          isPremium: user.isPremium,
        },
        ads,
      });
    }

    // ------------------ DELETE AN AD ------------------
    if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "Ad ID is required" });
    }

    // Get ad from DB
    const [adRows] = await users.query("SELECT image_path FROM ads WHERE id = ?", [id]);
    if (!adRows.length) {
      return res.status(404).json({ error: "Ad not found" });
    }

    const fullImagePath = adRows[0].image_path; 
    // Example: "https://gdd.freakoutgames.com/uploads/ads/ad1.png"

    //  Extract just the filename (ad1.png)
    const imageFilename = fullImagePath.split('/').pop();

    // Call PHP endpoint with only the filename
    const deleteRes = await fetch("https://gdd.freakoutgames.com/delete_ad_image.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: imageFilename }),
    });

    const deleteData = await deleteRes.json();
    if (!deleteData.success) {
      console.warn("Image deletion failed on server:", deleteData.error);
    }

    // Delete DB entry
    await users.execute("DELETE FROM ads WHERE id = ?", [id]);

    return res.status(200).json({ message: "Ad deleted successfully" });
  }

    // ------------------ CREATE NEW AD ------------------
    if (req.method === "POST") {
      const form = formidable({});
      const [fields, files] = await form.parse(req);

      const title = fields.title?.[0] || "";
      const description = fields.description?.[0] || "";
      const destination_url = fields.destination_url?.[0] || "";
      const category = fields.category?.[0] || "";
      const email = fields.email?.[0] || "";

      const file = files.image?.[0];
      if (!file) {
        return res.status(400).json({ error: "No image uploaded" });
      }

      const [userRows] = await users.query("SELECT id FROM users WHERE email = ?", [email]);
      if (!userRows.length) {
        return res.status(404).json({ error: "User not found" });
      }

      const userId = userRows[0].id;

      const fileBuffer = fs.readFileSync(file.filepath);
      const blob = new Blob([fileBuffer]);
      const formData = new FormData();

      formData.append("title", title);
      formData.append("description", description);
      formData.append("destination_url", destination_url);
      formData.append("category", category);
      formData.append("image", blob, file.originalFilename);
      formData.append("userId", userId);

      const uploadRes = await fetch("https://gdd.freakoutgames.com/upload_ad.php", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        return res.status(400).json({
          error: uploadData.error || "Upload failed",
        });
      }



      await users.execute(
        "INSERT INTO ads (title, description, destination_url, category, image_path, user_id) VALUES (?, ?, ?, ?, ?, ?)",
        [title, description, destination_url, category, uploadData.imageUrl, userId]
      );

      fs.unlinkSync(file.filepath);

      return res.status(200).json({
        message: "Ad created successfully!",
        imageUrl: uploadData.imageUrl,
      });
    }

    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
