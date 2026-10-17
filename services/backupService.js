const mysqldump = require("mysqldump");
const fs = require("fs");
const path = require("path");
const os = require("os");
let supabase = null;
try {
    supabase = require("../config/supabase");
} catch (_) {}

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
 * Membuat backup database MySQL/MariaDB secara asinkron
 * Mendukung penyimpanan di direktori aman (lokal /tmp) dan sinkronisasi ke Supabase Storage (jika aktif)
 */
async function backupDatabase() {
    const now = new Date();
    const timestampStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
    const fileName = `backup-${timestampStr}.sql`;

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

    console.log(`📦 [BACKUP] Memulai dump dari database: ${connectionConfig.database} (${connectionConfig.host}:${connectionConfig.port})...`);

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
        `-- DKM Crystal Database Backup`,
        `-- Database: ${connectionConfig.database}`,
        `-- Generated: ${now.toISOString()} (${now.toLocaleString('id-ID')})`,
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

    // 1. Simpan ke direktori yang aman (lokal backups/ atau /tmp/backups di Vercel)
    const backupsDir = getBackupsDir();
    const localFilePath = path.join(backupsDir, fileName);
    fs.writeFileSync(localFilePath, fileBuffer);
    console.log(`💾 [BACKUP] Tersimpan di disk: ${localFilePath} (${fileBuffer.length} bytes)`);

    // 2. Upload ke Supabase Storage jika dikonfigurasi dan aktif
    let uploadedToCloud = false;
    if (supabase && process.env.SUPABASE_BUCKET && process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes("placeholder")) {
        try {
            const { error } = await supabase.storage
                .from(process.env.SUPABASE_BUCKET)
                .upload(fileName, fileBuffer, {
                    contentType: "application/sql",
                    upsert: false
                });

            if (!error) {
                uploadedToCloud = true;
                console.log(`☁️ [BACKUP] Tersinkronisasi ke Supabase Storage: ${fileName}`);
            } else {
                console.warn(`⚠️ [BACKUP] Sinkronisasi Supabase gagal (tetap aman di disk): ${error.message}`);
            }
        } catch (sbErr) {
            console.warn(`⚠️ [BACKUP] Supabase offline/error (tetap aman di disk): ${sbErr.message}`);
        }
    }

    return {
        success: true,
        fileName,
        size: fileBuffer.length,
        localPath: localFilePath,
        uploadedToCloud,
        createdAt: now.toISOString()
    };
}

module.exports = {
    backupDatabase,
    getBackupsDir
};