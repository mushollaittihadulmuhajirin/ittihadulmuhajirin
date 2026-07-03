const path = require("path");
const restoreService = require("../services/restoreService");

// =========================
// HALAMAN RESTORE
// =========================
exports.index = async (req, res) => {

    res.render("restore", {
        title: "Restore"
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

            return res.status(400).json({
                success: false,
                message: "File harus berformat .sql"
            });

        }

        const result = await restoreService.restoreDatabase(req.file);

        return res.json({
            success: true,
            message: "Restore database berhasil.",
            fileName: req.file.originalname,
            data: result
        });

    } catch (err) {

        console.error("RESTORE ERROR:", err);

        return res.status(500).json({
            success: false,
            message: err.message || "Terjadi kesalahan saat restore database."
        });

    }

};