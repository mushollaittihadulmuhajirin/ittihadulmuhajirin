const mysql = require("mysql2");

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,

    enableKeepAlive: false,
    connectTimeout: 30000,

    multipleStatements: true,

    ssl: process.env.DB_SSL === "false" ? false : {
        minVersion: "TLSv1.2",
    },
});

// =========================
// TEST KONEKSI DATABASE
// =========================

db.getConnection((err, connection) => {
    if (err) {
        console.error("❌ Database pool connection error:", err.message);
        return;
    }

    connection.query(
        "SELECT VERSION() AS version, DATABASE() AS db",
        (queryErr, rows) => {
            if (queryErr) {
                console.error("❌ Database query error:", queryErr.message);
            } else {
                console.log("✅ Database connected:", rows[0]);
            }

            connection.release();
        }
    );
});

module.exports = db;