import Cors from "cors";

// Initialize CORS middleware
const cors = Cors({
  origin: [
    "http://localhost:3000",    // Local Development
    "https://gdh.freakoutgames.com",   // HostGator Frontend
    "https://gdhbackend.vercel.app/" // Vercel Preview
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

// Helper function to run middleware
export function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default cors;
