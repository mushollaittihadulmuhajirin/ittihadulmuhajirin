const mysql = require("mysql2");

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    waitForConnections: true,

    // Lebih kecil untuk lingkungan Vercel Serverless
    connectionLimit: 5,

    queueLimit: 0,

    // Jangan mempertahankan koneksi terlalu agresif
    enableKeepAlive: false,

    // Timeout koneksi
    connectTimeout: 10000,

    // Diperlukan untuk restore SQL
    multipleStatements: true
});

// =========================
// TEST KONEKSI
// =========================

db.query("SELECT DATABASE() AS db", (err, rows) => {

    if (err) {

        console.error("❌ Koneksi database gagal:");
        console.error(err);

        return;
    }

    console.log("✅ MySQL Connected");

    if (rows && rows.length > 0) {
        console.log("📂 Database aktif:", rows[0].db);
    }

});

module.exports = db;