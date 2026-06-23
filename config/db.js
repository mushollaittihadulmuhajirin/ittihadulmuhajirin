const mysql = require("mysql2");

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "dkm_laporankeuangan"
});

db.connect((err) => {
    if (err) {
        console.log("Koneksi gagal");
        console.log(err);
    } else {
        console.log("MySQL Connected");
    }
});

module.exports = db;