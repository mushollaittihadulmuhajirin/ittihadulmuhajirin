const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.get("/", (req, res) => {

    if (!req.session.user) {
        return res.redirect("/login");
    }

    // Ringkasan Keuangan
    db.query(`
        SELECT
        COALESCE(
            SUM(CASE WHEN jenis='masuk' THEN nominal ELSE 0 END),
            0
        ) AS pemasukan,

        COALESCE(
            SUM(CASE WHEN jenis='keluar' THEN nominal ELSE 0 END),
            0
        ) AS pengeluaran

    FROM transaksi
    `, (err, hasil) => {

        if (err) {
            console.log(err);
            return res.status(500).send("Terjadi kesalahan saat memuat dashboard");
        }

        const pemasukan = Number(hasil[0].pemasukan || 0);
        const pengeluaran = Number(hasil[0].pengeluaran || 0);
        const saldo = pemasukan - pengeluaran;

        // Ringkasan Inventaris
        db.query(`
            SELECT
            COUNT(*) AS total_aset,
COALESCE(SUM(jumlah),0) AS total_barang,
COALESCE(SUM(nilai_estimasi),0) AS nilai_aset
FROM aset
        `, (err2, aset) => {

            if (err2) {
                console.log(err2);
    return res.status(500).send("Gagal mengambil data inventaris");
            }

            // Ambil transaksi terakhir
            db.query(`
                SELECT
                transaksi.*,
                kategori.nama AS kategori_nama
                FROM transaksi
                LEFT JOIN kategori
                ON transaksi.kategori_id = kategori.id
                ORDER BY transaksi.tanggal DESC,
                transaksi.id DESC
                LIMIT 10
            `, (err3, aktivitas) => {

                if (err3) {
                    console.log(err3);
                    aktivitas = [];
                }

                res.render("dashboard", {

                    pemasukan,
                    pengeluaran,
                    saldo,

                    total_aset: aset?.[0]?.total_aset || 0,
                    total_barang: aset?.[0]?.total_barang || 0,
                    nilai_aset: aset?.[0]?.nilai_aset || 0,

                    aktivitas

                });

            });

        });

    });

});

module.exports = router;