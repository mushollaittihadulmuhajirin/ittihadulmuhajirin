const fs = require("fs");
const db = require("../config/db");
const backupService = require("./backupService");

// =========================
// Helper Query Promise
// =========================
function query(sql) {
    return new Promise((resolve, reject) => {
        db.query(sql, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

// =========================
// SMART RESTORE
// =========================
async function restoreDatabase(file) {

    if (!file) {
        throw new Error("File backup tidak ditemukan.");
    }

    if (!fs.existsSync(file.path)) {
        throw new Error("File backup tidak ditemukan.");
    }

    let sql = "";

    try {

        console.log("📦 [RESTORE] Mulai proses restore...");

        // =========================
        // 1. Auto Backup Safety
        // =========================
        console.log("💾 [RESTORE] Membuat backup otomatis...");
        await backupService.backupDatabase();

        // =========================
        // 2. Baca file SQL
        // =========================
        sql = fs.readFileSync(file.path, "utf8");

        // =========================
        // 3. Disable FK
        // =========================
        console.log("🔒 [RESTORE] Disable foreign key...");
        await query("SET FOREIGN_KEY_CHECKS = 0;");

        // =========================
        // 4. Drop semua tabel
        // =========================
        console.log("🧹 [RESTORE] Menghapus semua tabel...");

        const tables = await query("SHOW TABLES");

        if (tables.length > 0) {

            const key = Object.keys(tables[0])[0];

            for (const row of tables) {

                const tableName = row[key];

                await query(`DROP TABLE IF EXISTS \`${tableName}\`;`);

            }

        }

        // =========================
        // 5. Restore SQL FULL
        // =========================
        console.log("📥 [RESTORE] Import SQL backup...");
        await query(sql);

        // =========================
        // 6. Enable FK kembali
        // =========================
        await query("SET FOREIGN_KEY_CHECKS = 1;");

        // =========================
        // 7. Hapus file temporary
        // =========================
        fs.unlinkSync(file.path);

        console.log("✅ [RESTORE] Selesai sukses");

        return {
            success: true,
            message: "Restore database berhasil."
        };

    } catch (err) {

        console.error("❌ [RESTORE ERROR]", err.message);

        // =========================
        // Recovery FK kalau gagal
        // =========================
        try {
            await query("SET FOREIGN_KEY_CHECKS = 1;");
        } catch (_) {}

        // =========================
        // Cleanup file
        // =========================
        if (file && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }

        throw err;

    }

}

module.exports = {
    restoreDatabase
};