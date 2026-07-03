const backupService = require("../services/backupService");
const supabase = require("../config/supabase");

// =========================
// HALAMAN BACKUP
// =========================
exports.index = async (req, res) => {

    res.render("backup", {
        title: "Backup Database"
    });

};

// =========================
// BACKUP SEKARANG
// =========================
exports.backupNow = async (req, res) => {

    try {

        const result = await backupService.backupDatabase();

        res.json({
            success: true,
            message: "Backup database berhasil.",
            fileName: result.fileName
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

};

// =========================
// LIST BACKUP
// =========================
exports.listBackup = async (req, res) => {

    try {

        const { data, error } = await supabase.storage
            .from(process.env.SUPABASE_BUCKET)
            .list("", {
                sortBy: {
                    column: "created_at",
                    order: "desc"
                }
            });

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            files: data
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

};
// =========================
// DOWNLOAD BACKUP
// =========================
exports.downloadBackup = async (req, res) => {

    try {

        const fileName = req.params.fileName;

        const { data, error } = await supabase.storage
            .from(process.env.SUPABASE_BUCKET)
            .createSignedUrl(fileName, 60);

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            url: data.signedUrl
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

};