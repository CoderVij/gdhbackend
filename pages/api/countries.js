import {developers} from "../../lib/db";
import cors from "../../lib/cors";


function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => (result instanceof Error ? reject(result) : resolve(result)));
  });
}


export default async function handler(req, res) {

  await runMiddleware(req, res, cors);
       
  try {
    const [countryRows] = await developers.execute(`
      SELECT country, COUNT(*) AS count
      FROM developers
      GROUP BY country
      ORDER BY count DESC
    `);

    const [totalRows] = await developers.execute(`
      SELECT COUNT(*) AS total FROM developers
    `);

    res.status(200).json({
      success: true,
      data: countryRows,
      totalDevelopers: totalRows[0].total,
    });
  } catch (err) {
    console.error("Error fetching country stats:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}
