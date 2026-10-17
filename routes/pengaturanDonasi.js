const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("../config/db");

// ======================================
// MIDDLEWARE LOGIN
// ======================================
function checkLogin(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    return res.redirect("/login");
}

// ======================================
// MULTER STORAGE SETUP
// ======================================
const uploadDir = path.join(__dirname, "../public/uploads/qris");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeBase = "qris-" + Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, safeBase + ext);
    }
});

const fileFilter = function (req, file, cb) {
    const allowedMimes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (allowedMimes.includes(file.mimetype.toLowerCase())) {
        cb(null, true);
    } else {
        cb(new Error("Format file tidak didukung! Gunakan format gambar PNG, JPG, JPEG, atau WEBP."), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // Maksimal 2MB
});

// ======================================
// GET /pengaturan-donasi (FORM PENGATURAN)
// ======================================
router.get("/", checkLogin, (req, res) => {
    db.query("SELECT * FROM pengaturan_donasi WHERE id=1 LIMIT 1", (err, rows) => {
        if (err) {
            console.error("Error mengambil pengaturan_donasi:", err);
            return res.status(500).send("Gagal memuat pengaturan donasi dari database.");
        }

        const data = (rows && rows.length > 0) ? rows[0] : {
            id: 1,
            judul_panel: "Informasi Rekening & Donasi",
            tampil_panel: 1,
            bank_nama: "Mandiri",
            bank_rekening: "1220013513869",
            bank_atas_nama: "Muhammad Riyadi",
            tampil_bank: 1,
            qris_judul: "Donasi melalui QRIS",
            qris_petunjuk: "Pindai kode QR untuk berdonasi dengan aplikasi pembayaran yang mendukung QRIS.",
            qris_merchant: "MUSHOLA AL MUHAJIRIN",
            qris_nmid: "ID1024347808734",
            qris_gambar: "/images/qris/qris-mushola-al-muhajirin.jpg",
            tampil_qris: 1,
            qris_status: "Menunggu QRIS resmi",
            qris_keterangan_status: "QRIS belum diaktifkan untuk pembayaran sampai status dan keabsahannya dikonfirmasi oleh pengelola."
        };

        res.render("pengaturan_donasi", {
            data: data,
            user: req.session.user,
            status: req.query.status || null,
            error: req.query.error || null
        });
    });
});

// ======================================
// POST /pengaturan-donasi/simpan
// ======================================
router.post("/simpan", checkLogin, (req, res) => {
    upload.single("qris_gambar_file")(req, res, (err) => {
        if (err) {
            console.error("Upload error:", err.message);
            return res.redirect(`/pengaturan-donasi?error=${encodeURIComponent(err.message)}`);
        }

        const {
            judul_panel,
            tampil_panel,
            bank_nama,
            bank_rekening,
            bank_atas_nama,
            tampil_bank,
            qris_judul,
            qris_petunjuk,
            qris_merchant,
            qris_nmid,
            tampil_qris,
            qris_status,
            qris_keterangan_status
        } = req.body;

        // Validasi input wajib
        if (!bank_rekening || !bank_nama || !bank_atas_nama) {
            return res.redirect("/pengaturan-donasi?error=Informasi rekening bank wajib diisi lengkap.");
        }

        // Ambil gambar lama jika tidak ada unggahan baru
        db.query("SELECT qris_gambar FROM pengaturan_donasi WHERE id=1 LIMIT 1", (errOld, oldRows) => {
            let qrisGambarPath = (oldRows && oldRows.length > 0 && oldRows[0].qris_gambar) 
                ? oldRows[0].qris_gambar 
                : "/images/qris/qris-mushola-al-muhajirin.jpg";

            if (req.file) {
                qrisGambarPath = "/uploads/qris/" + req.file.filename;
            }

            const sqlUpdate = `
                UPDATE pengaturan_donasi SET
                    judul_panel = ?,
                    tampil_panel = ?,
                    bank_nama = ?,
                    bank_rekening = ?,
                    bank_atas_nama = ?,
                    tampil_bank = ?,
                    qris_judul = ?,
                    qris_petunjuk = ?,
                    qris_merchant = ?,
                    qris_nmid = ?,
                    qris_gambar = ?,
                    tampil_qris = ?,
                    qris_status = ?,
                    qris_keterangan_status = ?
                WHERE id = 1
            `;

            const params = [
                (judul_panel || "Informasi Rekening & Donasi").trim(),
                tampil_panel ? 1 : 0,
                bank_nama.trim(),
                bank_rekening.trim(),
                bank_atas_nama.trim(),
                tampil_bank ? 1 : 0,
                (qris_judul || "Donasi melalui QRIS").trim(),
                (qris_petunjuk || "Pindai kode QR untuk berdonasi dengan aplikasi pembayaran yang mendukung QRIS.").trim(),
                (qris_merchant || "MUSHOLA AL MUHAJIRIN").trim(),
                (qris_nmid || "ID1024347808734").trim(),
                qrisGambarPath,
                tampil_qris ? 1 : 0,
                (qris_status || "Menunggu QRIS resmi").trim(),
                (qris_keterangan_status || "QRIS belum diaktifkan untuk pembayaran sampai status dan keabsahannya dikonfirmasi oleh pengelola.").trim()
            ];

            db.query(sqlUpdate, params, (errUpd) => {
                if (errUpd) {
                    console.error("Gagal update pengaturan_donasi:", errUpd);
                    return res.redirect(`/pengaturan-donasi?error=${encodeURIComponent("Gagal menyimpan ke database: " + errUpd.sqlMessage)}`);
                }

                // Selaraskan juga dengan tabel rekening untuk Bank Mandiri
                db.query(
                    "UPDATE rekening SET bank=?, no_rekening=?, nama_pemilik=? WHERE id=5 OR no_rekening=?",
                    [bank_nama.trim(), bank_rekening.trim(), bank_atas_nama.trim(), bank_rekening.trim()],
                    (errRek) => {
                        if (errRek) {
                            console.warn("Sinkronisasi tabel rekening gagal (non-fatal):", errRek.message);
                        }
                        res.redirect("/pengaturan-donasi?status=sukses");
                    }
                );
            });
        });
    });
});

module.exports = router;

