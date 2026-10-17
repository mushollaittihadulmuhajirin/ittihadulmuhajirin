const express = require("express");
const router = express.Router();
const db = require("../config/db");
const saldoService = require("../services/saldoService");

/* ======================================================
   MIDDLEWARE LOGIN
====================================================== */
function checkLogin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.redirect("/login");
    }
    next();
}

/* ======================================================
   DASHBOARD UTAMA ADMIN
====================================================== */
router.get("/", checkLogin, async (req, res) => {
    try {
        // 1. Ringkasan Keuangan via saldoService (Official Cut-Off + Pasca Cut-Off)
        const ringkasanSaldo = await saldoService.getRingkasanSaldo(db);

        // 2. Ringkasan Inventaris
        const sqlAset = `
            SELECT
                COUNT(*) AS total_aset,
                COALESCE(SUM(jumlah), 0) AS total_barang,
                COALESCE(SUM(nilai_estimasi), 0) AS nilai_aset
            FROM aset
        `;

        db.query(sqlAset, (errAset, asetRows) => {
            const aset = asetRows?.[0] || { total_aset: 0, total_barang: 0, nilai_aset: 0 };

            // 3. Ringkasan Donasi Barang
            const sqlDonasi = `
                SELECT
                    COUNT(*) AS total_donasi,
                    COALESCE(SUM(estimasi_harga), 0) AS total_nilai_donasi
                FROM donasi_barang
            `;

            db.query(sqlDonasi, (errDonasi, donasiRows) => {
                const donasi = donasiRows?.[0] || { total_donasi: 0, total_nilai_donasi: 0 };

                // 4. Aktivitas Transaksi Terbaru (10 Transaksi Terakhir)
                const sqlAktivitas = `
                    SELECT
                        transaksi.*,
                        kategori.nama AS kategori_nama
                    FROM transaksi
                    LEFT JOIN kategori ON transaksi.kategori_id = kategori.id
                    ORDER BY transaksi.tanggal DESC, transaksi.id DESC
                    LIMIT 10
                `;

                db.query(sqlAktivitas, (errAktivitas, aktivitasRows) => {
                    res.render("dashboard", {
                        // 5 Kartu Keuangan Resmi
                        pemasukan: ringkasanSaldo.totalMasuk,
                        pengeluaran: ringkasanSaldo.totalKeluar,
                        saldo: ringkasanSaldo.saldoTotal,
                        saldoTotal: ringkasanSaldo.saldoTotal,
                        saldoTunai: ringkasanSaldo.saldoTunai,
                        saldoNonTunai: ringkasanSaldo.saldoNonTunai,
                        tanggalCutoff: ringkasanSaldo.tanggalCutoff,

                        // Ringkasan Inventaris
                        total_aset: aset.total_aset || 0,
                        total_barang: aset.total_barang || 0,
                        nilai_aset: aset.nilai_aset || 0,

                        // Ringkasan Donasi Barang
                        total_donasi: donasi.total_donasi || 0,
                        total_nilai_donasi: donasi.total_nilai_donasi || 0,

                        // Aktivitas
                        aktivitas: aktivitasRows || []
                    });
                });
            });
        });
    } catch (err) {
        console.error("Gagal memuat dashboard:", err);
        res.status(500).send("Terjadi kesalahan saat memuat dashboard");
    }
});

module.exports = router;