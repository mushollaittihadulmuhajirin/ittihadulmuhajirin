const fs = require("fs");
const path = require("path");
const backupService = require("../services/backupService");

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
// BACKUP MANUAL & UNDUH KE PERANGKAT
// Mendukung unduhan via AJAX blob maupun direct browser request
// =========================
exports.backupDownload = async (req, res) => {
    try {
        const result = await backupService.backupDatabase();

        // Header wajib agar browser (PC/Laptop & HP) memicu dialog unduhan
        res.setHeader("Content-Type", "application/sql");
        res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
        res.setHeader("Content-Length", result.size);
        res.setHeader("X-Backup-Filename", result.fileName);
        res.setHeader("X-Backup-Size", result.size);
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");

        // Kirim file langsung menggunakan res.download
        return res.download(result.localPath, result.fileName, (err) => {
            if (err) {
                console.error("❌ [BACKUP DOWNLOAD ERROR]:", err.message);
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        message: "Gagal mengirimkan file backup: " + err.message
                    });
                }
            } else {
                console.log(`✅ [BACKUP MANUAL] File ${result.fileName} (${result.size} bytes) sukses dikirim ke client.`);
            }
        });
    } catch (err) {
        console.error("❌ [BACKUP ERROR]:", err);
        res.status(500).json({
            success: false,
            message: err.message || "Gagal membuat backup database."
        });
    }
};

// =========================
// BACKUP SEKARANG (KOMPATIBILITAS)
// =========================
exports.backupNow = async (req, res) => {
    // Jika request menghendaki unduhan streaming langsung
    if (req.query.download === "true" || req.headers.accept?.includes("application/sql")) {
        return exports.backupDownload(req, res);
    }

    try {
        const result = await backupService.backupDatabase();

        res.json({
            success: true,
            message: "Backup database manual berhasil dibuat.",
            fileName: result.fileName,
            size: result.size,
            downloadUrl: `/backup/download/${encodeURIComponent(result.fileName)}`
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
// LIST BACKUP SEMENTARA
// =========================
exports.listBackup = async (req, res) => {
    try {
        const backupsDir = backupService.getBackupsDir();
        const files = [];

        if (fs.existsSync(backupsDir)) {
            const localFiles = fs.readdirSync(backupsDir).filter(f => f.endsWith(".sql"));
            localFiles.forEach(f => {
                const fPath = path.join(backupsDir, f);
                try {
                    const stat = fs.statSync(fPath);
                    files.push({
                        name: f,
                        metadata: { size: stat.size },
                        created_at: stat.mtime.toISOString(),
                        source: "local"
                    });
                } catch (_) {}
            });
        }

        files.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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
// DOWNLOAD BACKUP TERTENTU
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

        const backupsDir = backupService.getBackupsDir();
        const localFilePath = path.join(backupsDir, fileName);

        if (fs.existsSync(localFilePath)) {
            res.setHeader("Content-Type", "application/sql");
            res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
            return res.download(localFilePath, fileName);
        }

        return res.status(404).json({
            success: false,
            message: "File backup tidak ditemukan atau sesi sementara telah berakhir."
        });
    } catch (err) {
        console.error("Download backup error:", err);
        res.status(500).json({
            success: false,
            message: err.message || "Gagal mengunduh backup."
        });
    }
};