const path = require("path");
const fs = require("fs");
const restoreService = require("../services/restoreService");

// =========================
// HALAMAN RESTORE
// =========================
exports.index = async (req, res) => {
    res.render("restore", {
        title: "Restore Database",
        dbName: process.env.DB_NAME || "dkm_crystal_local_test"
    });
};

// =========================
// RESTORE DATABASE
// =========================
exports.restoreDatabase = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Silakan pilih file backup (.sql)."
            });
        }

        // Validasi ekstensi file
        const ext = path.extname(req.file.originalname).toLowerCase();
        if (ext !== ".sql") {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: "File harus berformat .sql"
            });
        }

        // Validasi ukuran file
        if (req.file.size === 0) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: "File backup kosong (0 bytes)."
            });
        }

        // Target database (default ke DB aktif atau target uji jika diizinkan)
        let targetDb = process.env.DB_NAME || "dkm_crystal_local_test";
        if (req.body.targetDatabase && (req.body.targetDatabase === "dkm_crystal_restore_test" || req.body.targetDatabase === process.env.DB_NAME)) {
            targetDb = req.body.targetDatabase;
        }

        const result = await restoreService.restoreDatabase(req.file, targetDb);

        return res.json({
            success: true,
            message: result.message || "Restore database berhasil.",
            fileName: req.file.originalname,
            targetDatabase: targetDb,
            tableCount: result.tableCount
        });

    } catch (err) {
        console.error("RESTORE ERROR:", err.message);

        return res.status(500).json({
            success: false,
            message: err.message || "Terjadi kesalahan saat restore database."
        });
    }
};