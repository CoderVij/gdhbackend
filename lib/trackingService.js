import { users } from "../lib/db";


export async function recordTracking(adId, type, ip, userAgent) {


  await users.execute(
    "INSERT INTO ad_tracking (ad_id, type, ip_address, user_agent) VALUES (?, ?, ?, ?)",
    [adId, type, ip, userAgent]
  );
}

export async function getAdStats(adId) {

  const [rows] = await users.query(
    `SELECT 
       SUM(type = 'impression') AS impressions,
       SUM(type = 'click') AS clicks
     FROM ad_tracking
     WHERE ad_id = ?`,
    [adId]
  );
  return rows[0];
}
