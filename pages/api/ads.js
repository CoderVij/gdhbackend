import formidable from "formidable";
import fs from "fs";
import fetch from "node-fetch";
import { users } from "../../lib/db";
import cors from "../../lib/cors";

export const config = {
  api: {
    bodyParser: false, // important for formidable
  },
};

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => (result instanceof Error ? reject(result) : resolve(result)));
  });
}

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });

  try {
    // ✅ Correct v3+ API usage
    const form = formidable({
      keepExtensions: true,
      multiples: false, // we are uploading only 1 file
    });

    // Parse the request
    const [fields, files] = await form.parse(req);

    // Get text fields
    const title = fields.title?.[0] || "";
    const description = fields.description?.[0] || "";
    const destination_url = fields.destination_url?.[0] || "";
    const category = fields.category?.[0] || "";

    console.log("Parsed fields:", { title, description, destination_url, category });

    // Get the uploaded file (temporarily stored by formidable)
    const imageFile = files.image?.[0];
    if (!imageFile) {
      return res.status(400).json({ error: "Image file is required" });
    }

    // Prepare file for Hostgator upload
    const fileStream = fs.createReadStream(imageFile.filepath);
    const uploadFormData = new FormData();
    uploadFormData.append("image", fileStream, imageFile.originalFilename);

    // Send to Hostgator
    const uploadRes = await fetch("https://gdd.freakoutgames.com/upload_ad.php", {
      method: "POST",
      body: uploadFormData,
    });

    const uploadData = await uploadRes.json();
    if (!uploadData.success) {
      return res.status(400).json({ error: uploadData.error || "Upload failed" });
    }

    // ✅ Save in DB
    await users.execute(
      "INSERT INTO ads (title, description, destination_url, category, image_path) VALUES (?, ?, ?, ?, ?)",
      [title, description, destination_url, category, uploadData.imageUrl]
    );

    res.status(200).json({ message: "Ad created successfully!", imageUrl: uploadData.imageUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}
