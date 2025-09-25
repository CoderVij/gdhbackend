import multer from "multer";
import path from "path";
import fs from "fs";
import { users } from "../../lib/db";

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) =>
      result instanceof Error ? reject(result) : resolve(result)
    );
  });
}

// Ensure upload folder exists
const uploadPath = path.join(process.cwd(), "public/uploads/ads");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const userId = req.body.userId || "0";
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `ad_${userId}_${timestamp}${ext}`);
  },
});

const upload = multer({ storage });

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  //  Add CORS headers manually
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  //  Handle preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    await runMiddleware(req, res, upload.single("image"));

    const { title = "", description = "", destination_url, category = "", userId } = req.body;

    if (!destination_url) {
      return res.status(400).json({ error: "Destination URL is required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Image upload is required" });
    }

    const imageUrl = `https://gdd.freakoutgames.com/uploads/ads/${req.file.filename}`;

    await users.execute(
      "INSERT INTO ads (title, description, destination_url, category, image_path) VALUES (?, ?, ?, ?, ?)",
      [title, description, destination_url, category, imageUrl]
    );

    return res.status(200).json({ message: "Ad created successfully!", imageUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
