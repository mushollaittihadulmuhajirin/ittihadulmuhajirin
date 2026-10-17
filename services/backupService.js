const mysqldump = require("mysqldump");
const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * Menentukan direktori penyimpanan backup yang aman:
 * - Pada Vercel Serverless (read-only filesystem), gunakan os.tmpdir() (/tmp/backups)
 * - Pada lokal / cPanel (writable filesystem), gunakan direktori 'backups/' di root project
 */
function getBackupsDir() {
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
        const tmpDir = path.join(os.tmpdir(), "backups");
        if (!fs.existsSync(tmpDir)) {
            try {
                fs.mkdirSync(tmpDir, { recursive: true });
            } catch (e) {
                return os.tmpdir();
            }
        }
        return tmpDir;
    }

    const localDir = path.join(__dirname, "../backups");
    if (!fs.existsSync(localDir)) {
        try {
            fs.mkdirSync(localDir, { recursive: true });
        } catch (e) {
            return os.tmpdir();
        }
    }
    return localDir;
}

/**
 * Membersihkan file backup sementara yang lebih tua dari maxAgeMinutes (default: 60 menit)
 */
function cleanOldTempBackups(maxAgeMinutes = 60) {
    try {
        const dir = getBackupsDir();
        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            const now = Date.now();
            files.forEach(file => {
                if (file.endsWith(".sql")) {
                    const filePath = path.join(dir, file);
                    try {
                        const stats = fs.statSync(filePath);
                        if (now - stats.mtimeMs > maxAgeMinutes * 60 * 1000) {
                            fs.unlinkSync(filePath);
                        }
                    } catch (_) {}
                }
            });
        }
    } catch (_) {}
}

/**
 * Membuat backup database MySQL/MariaDB/TiDB secara asinkron
 * Menghasilkan dump SQL mandiri dengan format nama unik `backup-dkm-YYYY-MM-DD-HH-mm-ss.sql`
 * yang disimpan sementara di server untuk langsung diunduh ke perangkat admin.
 */
async function backupDatabase() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const fileName = `backup-dkm-${year}-${month}-${day}-${hours}-${minutes}-${seconds}.sql`;

    // Konfigurasi SSL dinamis (aman untuk local MariaDB maupun TiDB Cloud)
    const isSsl = process.env.DB_SSL !== "false";
    const tidbCaPath = path.join(__dirname, "../tidb-ca.pem");
    let sslConfig = undefined;

    if (isSsl) {
        sslConfig = {
            minVersion: "TLSv1.2",
            rejectUnauthorized: false
        };
        if (fs.existsSync(tidbCaPath)) {
            try {
                sslConfig.ca = fs.readFileSync(tidbCaPath, "utf8");
                sslConfig.rejectUnauthorized = true;
            } catch (_) {}
        }
    }

    const connectionConfig = {
        host: process.env.DB_HOST || "127.0.0.1",
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "dkm_crystal_local_test"
    };

    if (sslConfig) {
        connectionConfig.ssl = sslConfig;
    }

    console.log(`📦 [BACKUP MANUAL] Memulai dump database: ${connectionConfig.database} (${connectionConfig.host}:${connectionConfig.port})...`);

    const result = await mysqldump({
        connection: connectionConfig,
        dump: {
            schema: {
                dropIfExist: true,
                autoIncrement: true,
                engine: true,
                table: {
                    ifNotExist: false
                }
            },
            data: {
                format: true,
                verbose: false
            }
        }
    });

    const sqlBackup = [
        `-- ========================================================`,
        `-- DKM Crystal Database Backup (Manual Admin)`,
        `-- Database: ${connectionConfig.database}`,
        `-- File: ${fileName}`,
        `-- Generated: ${now.toISOString()} (${now.toLocaleString('id-ID')})`,
        `-- Note: Berkas SQL ini dapat langsung dipulihkan melalui menu Restore`,
        `-- ========================================================`,
        ``,
        result.dump?.schema || "",
        result.dump?.data || "",
        result.dump?.trigger || ""
    ].join("\n");

    if (!sqlBackup.trim() || sqlBackup.length < 50) {
        throw new Error("Hasil backup SQL kosong atau tidak lengkap.");
    }

    const fileBuffer = Buffer.from(sqlBackup, "utf8");

    // Bersihkan file sementara lama jika ada
    cleanOldTempBackups(60);

    // Simpan ke direktori sementara (lokal backups/ atau /tmp/backups di Vercel)
    const backupsDir = getBackupsDir();
    const localFilePath = path.join(backupsDir, fileName);
    fs.writeFileSync(localFilePath, fileBuffer);
    console.log(`💾 [BACKUP MANUAL] Berkas sementara dibuat di disk: ${localFilePath} (${fileBuffer.length} bytes)`);

    return {
        success: true,
        fileName,
        size: fileBuffer.length,
        localPath: localFilePath,
        fileBuffer,
        createdAt: now.toISOString()
    };
}

module.exports = {
    backupDatabase,
    getBackupsDir,
    cleanOldTempBackups
};