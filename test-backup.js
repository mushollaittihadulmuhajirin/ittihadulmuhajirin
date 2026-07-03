require("dotenv").config();
const mysqldump = require("mysqldump");

(async () => {
  try {
    await mysqldump({
      connection: {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      },
      dumpToFile: "./backup-test.sql",
    });

    console.log("✅ Backup berhasil dibuat.");
  } catch (err) {
    console.error("❌ Backup gagal:");
    console.error(err);
  }
})();