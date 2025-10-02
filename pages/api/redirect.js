import { recordTracking } from "../../lib/trackingService";
import { users } from "../../lib/db";
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
  
  const { adId } = req.query;
  if (!adId) {
    return res.status(400).json({ error: "Missing adId" });
  }

  const [[ad]] = await users.query("SELECT destination_url FROM ads WHERE id = ?", [adId]);
  if (!ad) return res.status(404).json({ error: "Ad not found" });

  await recordTracking(
    adId,
    "click",
    req.headers["x-forwarded-for"] || req.socket.remoteAddress,
    req.headers["user-agent"]
  );

  res.writeHead(302, { location: ad.destination_url });
  res.end();
}
