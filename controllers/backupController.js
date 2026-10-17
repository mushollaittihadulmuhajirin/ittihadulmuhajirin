const fs = require("fs");
const path = require("path");
const backupService = require("../services/backupService");
let supabase = null;
try {
    supabase = require("../config/supabase");
} catch (_) {}

// =========================
// HALAMAN BACKUP
// =========================
exports.index = async (req, res) => {
    res.render("backup", {
        title: "Backup Database",
        dbName: process.env.DB_NAME || "dkm_crystal_local_test"
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
            message: "Backup database berhasil dibuat.",
            fileName: result.fileName,
            size: result.size,
            uploadedToCloud: result.uploadedToCloud
        });
    } catch (err) {
        console.error("Backup now error:", err);
        res.status(500).json({
            success: false,
            message: err.message || "Gagal membuat backup database."
        });
    }
};

// =========================
// LIST BACKUP
// =========================
exports.listBackup = async (req, res) => {
    try {
        const filesMap = new Map();

        // 1. Ambil file dari direktori lokal 'backups/'
        const backupsDir = path.join(__dirname, "../backups");
        if (fs.existsSync(backupsDir)) {
            const localFiles = fs.readdirSync(backupsDir).filter(f => f.endsWith(".sql"));
            localFiles.forEach(f => {
                const fPath = path.join(backupsDir, f);
                const stat = fs.statSync(fPath);
                filesMap.set(f, {
                    name: f,
                    metadata: { size: stat.size },
                    created_at: stat.birthtime.toISOString(),
                    source: "local"
                });
            });
        }

        // 2. Ambil dari Supabase jika dikonfigurasi
        if (supabase && process.env.SUPABASE_BUCKET && process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes("placeholder")) {
            try {
                const { data, error } = await supabase.storage
                    .from(process.env.SUPABASE_BUCKET)
                    .list("", {
                        sortBy: { column: "created_at", order: "desc" }
                    });

                if (!error && Array.isArray(data)) {
                    data.forEach(item => {
                        if (item.name && item.name.endsWith(".sql")) {
                            if (!filesMap.has(item.name)) {
                                filesMap.set(item.name, {
                                    name: item.name,
                                    metadata: item.metadata || { size: 0 },
                                    created_at: item.created_at || new Date().toISOString(),
                                    source: "cloud"
                                });
                            }
                        }
                    });
                }
            } catch (sbErr) {
                // Ignore cloud listing error if offline
            }
        }

        const files = Array.from(filesMap.values()).sort((a, b) => {
            return new Date(b.created_at) - new Date(a.created_at);
        });

        res.json({
            success: true,
            files
        });
    } catch (err) {
        console.error("List backup error:", err);
        res.status(500).json({
            success: false,
            message: err.message || "Gagal memuat daftar backup."
        });
    }
};

// =========================
// DOWNLOAD BACKUP
// =========================
exports.downloadBackup = async (req, res) => {
    try {
        const rawFileName = req.params.fileName;
        const fileName = path.basename(rawFileName); // Sanitasi path traversal

        if (!fileName.endsWith(".sql")) {
            return res.status(400).json({
                success: false,
                message: "Format file tidak valid."
            });
        }

        // 1. Periksa apakah file tersedia di folder lokal
        const backupsDir = path.join(__dirname, "../backups");
        const localFilePath = path.join(backupsDir, fileName);

        if (fs.existsSync(localFilePath)) {
            // Jika request meminta JSON info (dari fetch)
            if (req.headers.accept && req.headers.accept.includes("application/json")) {
                return res.json({
                    success: true,
                    url: `/backup/download/${encodeURIComponent(fileName)}?direct=true`
                });
            }
            // Stream file download
            return res.download(localFilePath, fileName);
        }

        // 2. Jika tidak ada di lokal, periksa di Supabase Storage
        if (supabase && process.env.SUPABASE_BUCKET) {
            const { data, error } = await supabase.storage
                .from(process.env.SUPABASE_BUCKET)
                .createSignedUrl(fileName, 60);

            if (!error && data?.signedUrl) {
                return res.json({
                    success: true,
                    url: data.signedUrl
                });
            }
        }

        return res.status(404).json({
            success: false,
            message: "File backup tidak ditemukan."
        });
    } catch (err) {
        console.error("Download backup error:", err);
        res.status(500).json({
            success: false,
            message: err.message || "Gagal mengunduh backup."
        });
    }
};