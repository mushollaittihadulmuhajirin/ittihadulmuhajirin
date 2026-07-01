const mysql = require("mysql2");

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

db.getConnection((err, connection) => {

    if (err) {
        console.error("❌ Koneksi database gagal");
        console.error(err);
        return;
    }

    console.log("✅ MySQL Connected");

    db.query("SELECT DATABASE() AS db", (err, rows) => {
        if (!err) {
            console.log("📂 Database aktif :", rows[0].db);
        }
    });

    connection.release();

});

module.exports = db;