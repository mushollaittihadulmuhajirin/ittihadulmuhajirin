const express = require("express");
const router = express.Router();
const db = require("../config/db");

// ======================================
// DAFTAR KATEGORI SARAN RESMI
// ======================================
const KATEGORI_RESMI = [
    "Pengurus DKM",
    "Marbot",
    "TPQ",
    "Pembangunan / Renovasi",
    "Sarana & Prasarana",
    "Kebersihan",
    "Kegiatan",
    "Lainnya"
];

// ======================================
// MIDDLEWARE LOGIN ADMIN
// ======================================
function checkLogin(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    return res.redirect("/login");
}

// ======================================
// API: GET /api/master-blok (PUBLIC)
// ======================================
function apiMasterBlok(req, res) {
    const rawQ = req.query.q || "";
    const q = String(rawQ).trim().toUpperCase();

    if (!q) {
        // Kembalikan seluruh blok aktif diurutkan abjad
        const sql = `SELECT id, kode_blok FROM master_blok WHERE aktif = 1 ORDER BY kode_blok ASC`;
        db.query(sql, (err, rows) => {
            if (err) {
                console.error("Gagal mengambil master blok:", err);
                return res.status(500).json({ success: false, error: "Gagal mengambil data master blok" });
            }
            res.json({
                success: true,
                total: rows.length,
                data: rows.map(r => r.kode_blok)
            });
        });
        return;
    }

    // Pencarian awalan (prefix match) diprioritaskan
    const prefixSql = `
        SELECT id, kode_blok
        FROM master_blok
        WHERE aktif = 1 AND kode_blok LIKE ?
        ORDER BY kode_blok ASC
        LIMIT 50
    `;

    db.query(prefixSql, [`${q}%`], (err, rows) => {
        if (err) {
            console.error("Gagal mencari master blok:", err);
            return res.status(500).json({ success: false, error: "Gagal memproses pencarian blok" });
        }

        if (rows.length > 0) {
            return res.json({
                success: true,
                query: q,
                total: rows.length,
                data: rows.map(r => r.kode_blok)
            });
        }

        // Jika pencarian awalan tidak menemukan hasil, coba pencarian mengandung substring (fallback)
        const subSql = `
            SELECT id, kode_blok
            FROM master_blok
            WHERE aktif = 1 AND kode_blok LIKE ?
            ORDER BY kode_blok ASC
            LIMIT 50
        `;
        db.query(subSql, [`%${q}%`], (errSub, subRows) => {
            if (errSub) {
                console.error("Gagal mencari master blok substring:", errSub);
                return res.status(500).json({ success: false, error: "Gagal memproses pencarian blok" });
            }

            res.json({
                success: true,
                query: q,
                total: subRows.length,
                data: subRows.map(r => r.kode_blok)
            });
        });
    });
}

// ======================================
// API: POST /api/saran (PUBLIC KIRIM SARAN)
// ======================================
function apiSimpanSaran(req, res) {
    const rawNama = req.body.nama || "";
    const rawBlok = req.body.blok || "";
    const rawKategori = req.body.kategori || "";
    const rawPesan = req.body.pesan || "";

    const nama = String(rawNama).trim();
    const blok = String(rawBlok).trim().toUpperCase();
    const kategori = String(rawKategori).trim();
    const pesan = String(rawPesan).trim();

    // 1. Validasi Nama
    if (!nama || nama.length < 2) {
        return res.status(400).json({
            success: false,
            error: "Nama wajib diisi minimal 2 karakter."
        });
    }

    // 2. Validasi Kategori
    if (!kategori || !KATEGORI_RESMI.includes(kategori)) {
        return res.status(400).json({
            success: false,
            error: "Kategori masukan tidak valid. Silakan pilih kategori yang tersedia."
        });
    }

    // 3. Validasi Pesan
    if (!pesan || pesan.length < 5) {
        return res.status(400).json({
            success: false,
            error: "Pesan atau masukan wajib diisi minimal 5 karakter."
        });
    }

    // 4. Validasi Blok terhadap Master Data Database (Kritis!)
    if (!blok) {
        return res.status(400).json({
            success: false,
            error: "Blok wajib dipilih dari daftar master blok resmi."
        });
    }

    const verifyBlokSql = `SELECT * FROM master_blok WHERE kode_blok = ? AND aktif = 1 LIMIT 1`;
    db.query(verifyBlokSql, [blok], (errBlok, rowsBlok) => {
        if (errBlok) {
            console.error("Error verifikasi blok di database:", errBlok);
            return res.status(500).json({
                success: false,
                error: "Terjadi kesalahan internal saat memvalidasi blok."
            });
        }

        if (!rowsBlok || rowsBlok.length === 0) {
            return res.status(400).json({
                success: false,
                error: `Kode blok "${blok}" tidak terdaftar dalam master data blok resmi atau sedang tidak aktif. Pastikan Anda memilih dari sugesti autocomplete.`
            });
        }

        // 5. Pencegahan Pengiriman Ganda (Double Submit Protection)
        const checkDuplicateSql = `
            SELECT id FROM saran_masukan
            WHERE nama = ? AND blok = ? AND pesan = ? AND created_at >= (NOW() - INTERVAL 30 SECOND)
            LIMIT 1
        `;
        db.query(checkDuplicateSql, [nama, blok, pesan], (errDup, dupRows) => {
            if (!errDup && dupRows && dupRows.length > 0) {
                return res.status(429).json({
                    success: false,
                    error: "Masukan serupa baru saja dikirim. Mohon tunggu beberapa saat sebelum mengirim kembali."
                });
            }

            // 6. Simpan Masukan ke Database
            const insertSql = `
                INSERT INTO saran_masukan (nama, blok, blok_id, kategori, pesan, status)
                VALUES (?, ?, ?, ?, ?, 'baru')
            `;
            db.query(insertSql, [nama, blok, rowsBlok[0].id, kategori, pesan], (errInsert, result) => {
                if (errInsert) {
                    console.error("Gagal menyimpan masukan ke database:", errInsert);
                    return res.status(500).json({
                        success: false,
                        error: "Gagal menyimpan masukan ke database. Silakan coba kembali."
                    });
                }

                res.json({
                    success: true,
                    message: "Alhamdulillah, saran & masukan Anda berhasil dikirim ke pengurus DKM.",
                    id: result.insertId
                });
            });
        });
    });
}

// ======================================
// ROUTE ADMIN: GET /saran (PANEL ADMIN)
// ======================================
router.get("/", checkLogin, (req, res) => {
    const { blok, kategori, status } = req.query;

    // Ambil daftar blok aktif untuk dropdown filter admin
    const sqlMasterBlok = `SELECT kode_blok FROM master_blok WHERE aktif = 1 ORDER BY kode_blok ASC`;
    db.query(sqlMasterBlok, (errBlok, rowsBlok) => {
        const listBlok = errBlok ? [] : rowsBlok.map(r => r.kode_blok);

        let sql = `SELECT * FROM saran_masukan WHERE 1=1`;
        const params = [];

        if (blok && blok.trim()) {
            sql += ` AND blok = ?`;
            params.push(blok.trim());
        }

        if (kategori && kategori.trim()) {
            sql += ` AND kategori = ?`;
            params.push(kategori.trim());
        }

        if (status && status.trim()) {
            sql += ` AND status = ?`;
            params.push(status.trim());
        }

        sql += ` ORDER BY created_at DESC, id DESC`;

        db.query(sql, params, (err, listSaran) => {
            if (err) {
                console.error("Gagal mengambil data saran masukan:", err);
                listSaran = [];
            }

            // Hitung statistik ringkas
            const totalSaran = listSaran.length;
            const saranBaru = listSaran.filter(s => s.status === 'baru').length;
            const saranDibaca = listSaran.filter(s => s.status === 'dibaca').length;
            const saranSelesai = listSaran.filter(s => s.status === 'selesai').length;

            res.render("saran", {
                user: req.session.user,
                listSaran,
                listBlok,
                kategoriList: KATEGORI_RESMI,
                filterBlok: blok || "",
                filterKategori: kategori || "",
                filterStatus: status || "",
                stats: { totalSaran, saranBaru, saranDibaca, saranSelesai },
                successMsg: req.query.success ? "Status berhasil diperbarui." : null
            });
        });
    });
});

// ======================================
// ROUTE ADMIN: UPDATE STATUS SARAN
// ======================================
router.post("/status/:id", checkLogin, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatus = ["baru", "dibaca", "selesai"];
    if (!validStatus.includes(status)) {
        return res.redirect("/saran");
    }

    db.query("UPDATE saran_masukan SET status = ? WHERE id = ?", [status, id], (err) => {
        if (err) console.error("Gagal update status saran:", err);
        res.redirect("/saran?success=1");
    });
});

// ======================================
// ROUTE ADMIN: HAPUS SARAN
// ======================================
router.post("/hapus/:id", checkLogin, (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM saran_masukan WHERE id = ?", [id], (err) => {
        if (err) console.error("Gagal hapus saran:", err);
        res.redirect("/saran");
    });
});

// Daftarkan route API publik pada router ini juga
router.get("/api/master-blok", apiMasterBlok);
router.post("/api/kirim", apiSimpanSaran);

module.exports = {
    router,
    apiMasterBlok,
    apiSimpanSaran
};
