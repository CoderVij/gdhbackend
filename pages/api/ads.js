import formidable from "formidable";
import fs from "fs";
import fetch from "node-fetch";
import { users } from "../../lib/db";
import cors from "../../lib/cors";

export const config = {
  api: {
    bodyParser: false, // Required for formidable
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
  if (req.method !== "POST") {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // Parse incoming form
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    console.log("Parsed fields:", fields);

    const title = fields.title?.[0] || "";
    const description = fields.description?.[0] || "";
    const destination_url = fields.destination_url?.[0] || "";
    const category = fields.category?.[0] || "";

    // Prepare FormData for Hostgator
    const file = files.image?.[0];
    if (!file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const fileStream = fs.createReadStream(file.filepath);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("destination_url", destination_url);
    formData.append("category", category);
    formData.append("image", fileStream, file.originalFilename);

    // Send to Hostgator
    const uploadRes = await fetch(
      "https://gdd.freakoutgames.com/upload_ad.php",
      {
        method: "POST",
        body: formData,
      }
    );

    const uploadData = await uploadRes.json();

    if (!uploadData.success) {
      return res.status(400).json({
        error: uploadData.error || "Upload failed",
      });
    }

    // Store in DB
    await users.execute(
      "INSERT INTO ads (title, description, destination_url, category, image_path) VALUES (?, ?, ?, ?, ?)",
      [title, description, destination_url, category, uploadData.imageUrl]
    );

    res.status(200).json({
      message: "Ad created successfully!",
      imageUrl: uploadData.imageUrl,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Server error" });
  }
}
