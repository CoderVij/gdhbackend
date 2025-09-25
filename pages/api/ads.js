
import fetch from "node-fetch";
import { users } from "../../lib/db";
import cors from "../../lib/cors";

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => (result instanceof Error ? reject(result) : resolve(result)));
  });
}


export const config = {
  api: {
    bodyParser: false, // We'll handle FormData manually
  },
};

export default async function handler(req, res) {

  await runMiddleware(req, res, cors);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // Collect FormData from request (image + fields)
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks);

    // Send to Hostgator PHP endpoint
    const uploadRes = await fetch("https://gdd.freakoutgames.com/upload_ad.php", {
      method: "POST",
      headers: {
        "Content-Type": req.headers["content-type"],
      },
      body: rawBody,
    });

    const uploadData = await uploadRes.json();
    if (!uploadData.success) {
      return res.status(400).json({ error: uploadData.error || "Upload failed" });
    }

    // Extract other fields
    const formData = new URLSearchParams(req.url.split("?")[1] || "");
    const title = formData.get("title") || "";
    const description = formData.get("description") || "";
    const destination_url = formData.get("destination_url") || "";
    const category = formData.get("category") || "";

    // Save to database
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
