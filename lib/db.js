import mysql from "mysql2/promise";

// Create a connection pool (better for multiple requests)
const developers = mysql.createPool({
  host: process.env.DB_HOST,     // e.g. "localhost" or your HostGator MySQL host
  user: process.env.DB_USER,     // DB username
  password: process.env.DB_PASS, // DB password
  database: process.env.DB_NAME, // Database name
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const users = mysql.createPool({
  host: process.env.DB_HOST,     // e.g. "localhost" or your HostGator MySQL host
  user: process.env.DB_USER,     // DB username
  password: process.env.DB_PASS, // DB password
  database: process.env.DB_NAME, // Database name
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}); 

export default {developers, users};
