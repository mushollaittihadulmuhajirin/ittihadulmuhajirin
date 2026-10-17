const express = require("express");
const router = express.Router();
const db = require("../config/db");

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
// 1. GET /master-blok (ADMIN LIST BLOK)
// ======================================
router.get("/", checkLogin, (req, res) => {
    const rawQ = req.query.q || "";
    const q = String(rawQ).trim().toUpperCase();
    const filterStatus = req.query.status || "semua";
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const perPage = 20;

    // Ambil statistik ringkas keseluruhan
    const statSql = `
        SELECT
            COUNT(*) AS total_semua,
            SUM(CASE WHEN aktif = 1 THEN 1 ELSE 0 END) AS total_aktif,
            SUM(CASE WHEN aktif = 0 THEN 1 ELSE 0 END) AS total_nonaktif
        FROM master_blok
    `;

    db.query(statSql, (errStat, statRows) => {
        if (errStat) {
            console.error("Gagal mengambil statistik master blok:", errStat);
        }

        const stats = statRows && statRows[0] ? {
            totalSemua: statRows[0].total_semua || 0,
            totalAktif: statRows[0].total_aktif || 0,
            totalNonaktif: statRows[0].total_nonaktif || 0
        } : { totalSemua: 0, totalAktif: 0, totalNonaktif: 0 };

        // Query data tabel dengan filter pencarian dan status
        let whereClauses = ["1=1"];
        const params = [];

        if (q) {
            whereClauses.push("m.kode_blok LIKE ?");
            params.push(`%${q}%`);
        }

        if (filterStatus === "aktif") {
            whereClauses.push("m.aktif = 1");
        } else if (filterStatus === "nonaktif") {
            whereClauses.push("m.aktif = 0");
        }

        const whereSql = whereClauses.join(" AND ");

        // Hitung total baris yang cocok untuk pagination
        const countSql = `SELECT COUNT(*) AS countFiltered FROM master_blok m WHERE ${whereSql}`;

        db.query(countSql, params, (errCount, countRows) => {
            const totalFiltered = countRows && countRows[0] ? countRows[0].countFiltered : 0;
            const totalPages = Math.max(1, Math.ceil(totalFiltered / perPage));
            const currentPage = Math.min(page, totalPages);
            const offset = (currentPage - 1) * perPage;

            // Query baris data lengkap dengan penghitungan relasi ke saran_masukan
            const dataSql = `
                SELECT
                    m.id,
                    m.kode_blok,
                    m.aktif,
                    m.created_at,
                    m.updated_at,
                    COUNT(s.id) AS jumlah_masukan
                FROM master_blok m
                LEFT JOIN saran_masukan s ON (s.blok_id = m.id OR s.blok = m.kode_blok)
                WHERE ${whereSql}
                GROUP BY m.id, m.kode_blok, m.aktif, m.created_at, m.updated_at
                ORDER BY m.kode_blok ASC
                LIMIT ? OFFSET ?
            `;

            db.query(dataSql, [...params, perPage, offset], (errData, listBlok) => {
                if (errData) {
                    console.error("Gagal mengambil daftar master blok:", errData);
                    listBlok = [];
                }

                res.render("master_blok", {
                    user: req.session.user || { username: "admin" },
                    listBlok: listBlok || [],
                    stats,
                    filterQ: q,
                    filterStatus,
                    pagination: {
                        currentPage,
                        totalPages,
                        totalFiltered,
                        perPage
                    },
                    successMsg: req.query.success || null,
                    errorMsg: req.query.error || null
                });
            });
        });
    });
});

// ======================================
// 2. POST /master-blok/tambah
// ======================================
router.post("/tambah", checkLogin, (req, res) => {
    const rawKode = req.body.kode_blok || "";
    const rawAktif = req.body.aktif;
    const kodeBlok = String(rawKode).trim().toUpperCase();
    const aktif = (rawAktif === "0" || rawAktif === 0 || rawAktif === false) ? 0 : 1;

    // Validasi kode blok: Wajib diisi, hanya huruf, angka, dan panjang 2-10 karakter
    if (!kodeBlok || kodeBlok.length < 2 || kodeBlok.length > 10) {
        return res.redirect(`/master-blok?error=${encodeURIComponent("Kode blok wajib diisi antara 2 sampai 10 karakter.")}`);
    }

    // Format alfanumerik (misal: A01, A12A, N01)
    const regexBlok = /^[A-Z0-9]+$/;
    if (!regexBlok.test(kodeBlok)) {
        return res.redirect(`/master-blok?error=${encodeURIComponent("Format kode blok tidak valid. Hanya diperbolehkan huruf kapital dan angka (contoh: A01, A12A, N01).")}`);
    }

    // Cek duplikasi di database
    const checkSql = "SELECT id, kode_blok FROM master_blok WHERE kode_blok = ? LIMIT 1";
    db.query(checkSql, [kodeBlok], (errCheck, rowsCheck) => {
        if (errCheck) {
            console.error("Error cek duplikasi blok:", errCheck);
            const msg = (errCheck.code === "ER_NO_SUCH_TABLE")
                ? "Tabel master_blok belum dibuat di database. Harap jalankan migrasi database terlebih dahulu."
                : "Gagal memeriksa keunikan kode blok.";
            return res.redirect(`/master-blok?error=${encodeURIComponent(msg)}`);
        }

        if (rowsCheck && rowsCheck.length > 0) {
            return res.redirect(`/master-blok?error=${encodeURIComponent(`Kode blok "${kodeBlok}" sudah terdaftar sebelumnya. Gunakan kode lain atau edit blok tersebut.`)}`);
        }

        // Simpan ke database
        const insertSql = "INSERT INTO master_blok (kode_blok, aktif) VALUES (?, ?)";
        db.query(insertSql, [kodeBlok, aktif], (errInsert, result) => {
            if (errInsert) {
                console.error("Gagal menambahkan master blok:", errInsert);
                return res.redirect(`/master-blok?error=${encodeURIComponent("Terjadi kesalahan sistem saat menyimpan kode blok.")}`);
            }

            res.redirect(`/master-blok?success=${encodeURIComponent(`Kode blok "${kodeBlok}" berhasil ditambahkan ke database.`)}`);
        });
    });
});

// ======================================
// 3. POST /master-blok/:id/edit
// ======================================
router.post("/:id/edit", checkLogin, (req, res) => {
    const { id } = req.params;
    const rawKode = req.body.kode_blok || "";
    const rawAktif = req.body.aktif;
    const kodeBlok = String(rawKode).trim().toUpperCase();
    const aktif = (rawAktif === "0" || rawAktif === 0 || rawAktif === false) ? 0 : 1;

    if (!kodeBlok || kodeBlok.length < 2 || kodeBlok.length > 10) {
        return res.redirect(`/master-blok?error=${encodeURIComponent("Kode blok wajib diisi antara 2 sampai 10 karakter.")}`);
    }

    const regexBlok = /^[A-Z0-9]+$/;
    if (!regexBlok.test(kodeBlok)) {
        return res.redirect(`/master-blok?error=${encodeURIComponent("Format kode blok tidak valid. Hanya diperbolehkan huruf kapital dan angka.")}`);
    }

    // Cek apakah data blok ada
    db.query("SELECT id, kode_blok FROM master_blok WHERE id = ? LIMIT 1", [id], (errFind, rowsFind) => {
        if (errFind || !rowsFind || rowsFind.length === 0) {
            return res.redirect(`/master-blok?error=${encodeURIComponent("Data blok tidak ditemukan.")}`);
        }

        const oldKode = rowsFind[0].kode_blok;

        // Cek duplikasi dengan kode lain
        db.query("SELECT id FROM master_blok WHERE kode_blok = ? AND id != ? LIMIT 1", [kodeBlok, id], (errDup, rowsDup) => {
            if (errDup) {
                return res.redirect(`/master-blok?error=${encodeURIComponent("Gagal memeriksa keunikan kode blok.")}`);
            }

            if (rowsDup && rowsDup.length > 0) {
                return res.redirect(`/master-blok?error=${encodeURIComponent(`Kode blok "${kodeBlok}" sudah digunakan oleh blok lain.`)}`);
            }

            // Update master_blok
            const updateSql = "UPDATE master_blok SET kode_blok = ?, aktif = ? WHERE id = ?";
            db.query(updateSql, [kodeBlok, aktif, id], (errUp) => {
                if (errUp) {
                    console.error("Gagal update master blok:", errUp);
                    return res.redirect(`/master-blok?error=${encodeURIComponent("Gagal memperbarui data blok.")}`);
                }

                // Jika kode berubah, sinkronkan juga label kode pada riwayat masukan warga yang terhubung
                if (oldKode !== kodeBlok) {
                    db.query("UPDATE saran_masukan SET blok = ? WHERE blok_id = ? OR blok = ?", [kodeBlok, id, oldKode], (errSync) => {
                        if (errSync) console.error("Gagal sinkronisasi data masukan warga:", errSync);
                    });
                }

                res.redirect(`/master-blok?success=${encodeURIComponent(`Kode blok "${kodeBlok}" berhasil diperbarui.`)}`);
            });
        });
    });
});

// ======================================
// 4. POST /master-blok/:id/toggle (AKTIF / NONAKTIF)
// ======================================
router.post("/:id/toggle", checkLogin, (req, res) => {
    const { id } = req.params;

    db.query("SELECT id, kode_blok, aktif FROM master_blok WHERE id = ? LIMIT 1", [id], (errFind, rows) => {
        if (errFind || !rows || rows.length === 0) {
            return res.redirect(`/master-blok?error=${encodeURIComponent("Blok tidak ditemukan.")}`);
        }

        const currentAktif = rows[0].aktif;
        const newAktif = currentAktif === 1 ? 0 : 1;
        const statusLabel = newAktif === 1 ? "diaktifkan" : "dinonaktifkan";

        db.query("UPDATE master_blok SET aktif = ? WHERE id = ?", [newAktif, id], (errUp) => {
            if (errUp) {
                console.error("Gagal mengubah status aktif blok:", errUp);
                return res.redirect(`/master-blok?error=${encodeURIComponent("Gagal mengubah status blok.")}`);
            }

            res.redirect(`/master-blok?success=${encodeURIComponent(`Blok "${rows[0].kode_blok}" berhasil ${statusLabel}.`)}`);
        });
    });
});

// ======================================
// 5. POST /master-blok/:id/hapus
// ======================================
router.post("/:id/hapus", checkLogin, (req, res) => {
    const { id } = req.params;

    db.query("SELECT id, kode_blok FROM master_blok WHERE id = ? LIMIT 1", [id], (errFind, rows) => {
        if (errFind || !rows || rows.length === 0) {
            return res.redirect(`/master-blok?error=${encodeURIComponent("Blok tidak ditemukan.")}`);
        }

        const kodeBlok = rows[0].kode_blok;

        // PERLINDUNGAN INTEGRITAS DATA HISTORIS:
        // Cek apakah kode blok ini pernah dipakai dalam saran_masukan
        const checkUsageSql = `
            SELECT COUNT(*) AS total
            FROM saran_masukan
            WHERE blok_id = ? OR blok = ?
        `;

        db.query(checkUsageSql, [id, kodeBlok], (errUsage, rowsUsage) => {
            if (errUsage) {
                console.error("Error cek penggunaan blok:", errUsage);
                return res.redirect(`/master-blok?error=${encodeURIComponent("Gagal memeriksa riwayat penggunaan blok.")}`);
            }

            const totalUsage = rowsUsage && rowsUsage[0] ? rowsUsage[0].total : 0;

            if (totalUsage > 0) {
                // TOLAK PENGHAPUSAN PERMANEN
                return res.redirect(`/master-blok?error=${encodeURIComponent(`Blok "${kodeBlok}" tidak dapat dihapus karena telah digunakan pada ${totalUsage} data masukan warga. Silakan gunakan aksi Nonaktifkan agar kode tidak muncul di formulir warga namun data historis tetap aman.`)}`);
            }

            // Jika belum pernah digunakan, boleh dihapus secara permanen
            db.query("DELETE FROM master_blok WHERE id = ?", [id], (errDel) => {
                if (errDel) {
                    console.error("Gagal menghapus master blok:", errDel);
                    return res.redirect(`/master-blok?error=${encodeURIComponent("Terjadi kesalahan sistem saat menghapus blok.")}`);
                }

                res.redirect(`/master-blok?success=${encodeURIComponent(`Blok "${kodeBlok}" berhasil dihapus secara permanen.`)}`);
            });
        });
    });
});

module.exports = router;

