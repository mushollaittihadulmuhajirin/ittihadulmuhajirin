const fs = require("fs");
const mysql = require("mysql2");
const defaultDb = require("../config/db");
const backupService = require("./backupService");

/**
 * Menjalankan restore database dari file SQL yang diunggah
 * @param {object} file - Objek file dari Multer ({ path, originalname, size })
 * @param {string} [targetDbName] - Nama database target (default: process.env.DB_NAME)
 */
async function restoreDatabase(file, targetDbName) {
    if (!file) {
        throw new Error("File backup tidak ditemukan.");
    }

    if (!fs.existsSync(file.path)) {
        throw new Error("Berkas fisik backup tidak ditemukan di server.");
    }

    const targetDatabase = targetDbName || process.env.DB_NAME || "dkm_crystal_local_test";

    // 1. Validasi Integritas File SQL
    const fileStats = fs.statSync(file.path);
    if (fileStats.size === 0) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        throw new Error("File backup kosong (0 bytes). Pemulihan dibatalkan.");
    }

    const sqlContent = fs.readFileSync(file.path, "utf8");
    if (!sqlContent.trim()) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        throw new Error("Konten file backup kosong.");
    }

    // Periksa apakah berkas memiliki struktur SQL valid
    const hasSqlKeywords = /CREATE\s+TABLE|INSERT\s+INTO|DROP\s+TABLE/i.test(sqlContent);
    if (!hasSqlKeywords) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        throw new Error("Format file tidak valid. Berkas tidak memuat struktur tabel atau data SQL yang sah.");
    }

    // Buat koneksi khusus ke target database jika targetDbName berbeda dari defaultDb
    let activeConnection = defaultDb;
    let customPool = null;

    if (targetDbName && targetDbName !== process.env.DB_NAME) {
        const isLocalTest = targetDbName === "dkm_crystal_restore_test" || targetDbName === "dkm_crystal_local_test";
        const isSsl = !isLocalTest && process.env.DB_SSL !== "false";
        customPool = mysql.createPool({
            host: isLocalTest ? (process.env.TEST_DB_HOST || "127.0.0.1") : (process.env.DB_HOST || "127.0.0.1"),
            port: isLocalTest ? Number(process.env.TEST_DB_PORT || 3306) : Number(process.env.DB_PORT || 3306),
            user: isLocalTest ? (process.env.TEST_DB_USER || "root") : (process.env.DB_USER || "root"),
            password: isLocalTest ? (process.env.TEST_DB_PASSWORD || "") : (process.env.DB_PASSWORD || ""),
            database: targetDbName,
            multipleStatements: true,
            ssl: isSsl ? { minVersion: "TLSv1.2" } : false
        });
        activeConnection = customPool;
    }

    function runQuery(sql) {
        return new Promise((resolve, reject) => {
            activeConnection.query(sql, (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    }

    try {
        console.log(`📦 [RESTORE] Memulai proses restore ke target database: \`${targetDatabase}\`...`);

        // 2. Auto Backup Safety (hanya jika merestore ke database utama aktif)
        if (!targetDbName || targetDbName === process.env.DB_NAME) {
            console.log("💾 [RESTORE] Membuat backup keselamatan otomatis sebelum pemulihan...");
            try {
                await backupService.backupDatabase();
            } catch (backupErr) {
                console.warn("⚠️ [RESTORE] Safety backup gagal dibuat, melanjutkan dengan hati-hati:", backupErr.message);
            }
        }

        // 3. Disable Foreign Key Checks
        console.log("🔒 [RESTORE] Menonaktifkan foreign key checks...");
        await runQuery("SET FOREIGN_KEY_CHECKS = 0;");

        // 4. Drop tabel-tabel lama pada target database
        console.log(`🧹 [RESTORE] Membersihkan tabel pada database \`${targetDatabase}\`...`);
        const tables = await runQuery("SHOW TABLES;");

        if (Array.isArray(tables) && tables.length > 0) {
            const key = Object.keys(tables[0])[0];
            for (const row of tables) {
                const tableName = row[key];
                await runQuery(`DROP TABLE IF EXISTS \`${tableName}\`;`);
            }
        }

        // 5. Eksekusi SQL Dump (kompatibilitas collation lintas MySQL 8 / TiDB / MariaDB)
        console.log("📥 [RESTORE] Mengimpor skema dan data backup SQL...");
        let executableSql = sqlContent;
        if (executableSql.includes("utf8mb4_0900_ai_ci")) {
            executableSql = executableSql.replace(/utf8mb4_0900_ai_ci/g, "utf8mb4_unicode_ci");
        }
        await runQuery(executableSql);

        // 6. Enable Foreign Key Checks kembali
        await runQuery("SET FOREIGN_KEY_CHECKS = 1;");

        // 7. Ambil daftar tabel yang berhasil dipulihkan
        const restoredTables = await runQuery("SHOW TABLES;");
        const tableCount = Array.isArray(restoredTables) ? restoredTables.length : 0;

        console.log(`✅ [RESTORE] Sukses! ${tableCount} tabel berhasil dipulihkan pada \`${targetDatabase}\`.`);

        // 8. Hapus file temporary upload
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }

        if (customPool) {
            customPool.end();
        }

        return {
            success: true,
            targetDatabase,
            tableCount,
            message: `Restore database berhasil. ${tableCount} tabel telah dipulihkan pada ${targetDatabase}.`
        };

    } catch (err) {
        console.error("❌ [RESTORE ERROR]:", err.message);

        // Recovery: Pastikan FK selalu dikembalikan aktif
        try {
            await runQuery("SET FOREIGN_KEY_CHECKS = 1;");
        } catch (_) {}

        // Cleanup temporary file
        if (file && fs.existsSync(file.path)) {
            try { fs.unlinkSync(file.path); } catch (_) {}
        }

        if (customPool) {
            try { customPool.end(); } catch (_) {}
        }

        throw new Error("Gagal melakukan restore: " + (err.sqlMessage || err.message));
    }
}

module.exports = {
    restoreDatabase
};