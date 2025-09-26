import formidable from "formidable";
import fetch from "node-fetch";
import { users } from "../../lib/db";
import cors from "../../lib/cors";

export const config = {
  api: {
    bodyParser: false, // important!
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
    // Parse multipart form (image + fields)
    const form = new formidable.IncomingForm();
    form.keepExtensions = true;

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error(err);
        return res.status(400).json({ error: "Form parsing failed" });
      }

      // Prepare image file for upload
      const fileStream = fs.createReadStream(files.image.filepath);
      const formData = new FormData();
      formData.append("image", fileStream, files.image.originalFilename);

      // Upload to Hostgator PHP endpoint
      const uploadRes = await fetch("https://gdd.freakoutgames.com/upload_ad.php", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        return res.status(400).json({ error: uploadData.error || "Upload failed" });
      }

      //  Now we can safely access text fields
      const title = fields.title || "";
      const description = fields.description || "";
      const destination_url = fields.destination_url || "";
      const category = fields.category || "";

      console.log("Parsed data:", { title, description, destination_url, category });

      await users.execute(
        "INSERT INTO ads (title, description, destination_url, category, image_path) VALUES (?, ?, ?, ?, ?)",
        [title, description, destination_url, category, uploadData.imageUrl]
      );

      res.status(200).json({ message: "Ad created successfully!", imageUrl: uploadData.imageUrl });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}
