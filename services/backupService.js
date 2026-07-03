const mysqldump = require("mysqldump");
const fs = require("fs");
const path = require("path");
const supabase = require("../config/supabase");

async function backupDatabase() {

    // =========================
    // Folder Temporary
    // =========================
    const backupDir = path.join(__dirname, "../temp");

    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    // =========================
    // Nama File Backup
    // =========================
    const now = new Date();

    const fileName =
        `backup-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}.sql`;

    const filePath = path.join(backupDir, fileName);

    // =========================
    // Generate SQL Backup
    // =========================
    await mysqldump({

        connection: {
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        },

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

        },

        dumpToFile: filePath

    });

    // =========================
    // Upload ke Supabase Storage
    // =========================
    const fileBuffer = fs.readFileSync(filePath);

    const { error } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .upload(fileName, fileBuffer, {
            contentType: "application/sql",
            upsert: false
        });

    if (error) {
        throw error;
    }

    // =========================
    // Hapus File Temporary
    // =========================
    try {

        fs.unlinkSync(filePath);

    } catch (err) {

        console.log("Warning: gagal menghapus file sementara.", err.message);

    }

    return {
        success: true,
        fileName
    };

}

module.exports = {
    backupDatabase
};