
const express = require("express");
const router = express.Router();

const db = require("../config/db");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const exportService = require("../services/laporanExportService");
const saldoService = require("../services/saldoService");

// ======================================
// FUNGSI RENDER LAPORAN (SHARED)
// ======================================

async function renderLaporanPage(req, res) {

    const { mulai, sampai } = req.query;

    try {
        const ringkasanSaldo = await saldoService.getRingkasanSaldo(db);

        let sql = `
            SELECT
                transaksi.*,
                kategori.nama AS kategori_nama,
                rekening.bank,
                rekening.no_rekening
            FROM transaksi
            LEFT JOIN kategori
                ON transaksi.kategori_id = kategori.id
            LEFT JOIN rekening
                ON transaksi.rekening_id = rekening.id
        `;

        const params = [];

        if (mulai && sampai) {
            sql += `
                WHERE transaksi.tanggal BETWEEN ? AND ?
            `;
            params.push(mulai, sampai);
        }

        sql += `
            ORDER BY transaksi.tanggal DESC,
                     transaksi.id DESC
        `;

        db.query(sql, params, (err, transaksi) => {

            if (err) {
                console.log(err);
                return res.send("Error mengambil transaksi");
            }

        db.query(
            `
            SELECT *
            FROM aset
           ORDER BY tanggal_masuk DESC, id DESC
            `,
            (errAset, aset) => {

                if (errAset) {
                    console.log(errAset);
                    aset = [];
                }

                db.query(
                    `
                    SELECT *
                    FROM donasi_barang
                    ORDER BY tanggal DESC, id DESC
                    `,
                    (errDonasi, donasi) => {

                        if (errDonasi) {
                            console.log(errDonasi);
                            donasi = [];
                        }

                        // ===========================
                        // AMBIL PENGATURAN DONASI & QRIS
                        // ===========================
                        db.query(
                            `SELECT * FROM pengaturan_donasi WHERE id=1 LIMIT 1`,
                            (errPengaturan, rowsPengaturan) => {

                                const defaultDonasi = {
                                    id: 1,
                                    judul_panel: 'Informasi Rekening & Donasi',
                                    tampil_panel: 1,
                                    bank_nama: 'Mandiri',
                                    bank_rekening: '1220013513869',
                                    bank_atas_nama: 'Muhammad Riyadi',
                                    tampil_bank: 1,
                                    qris_judul: 'Donasi melalui QRIS',
                                    qris_petunjuk: 'Pindai kode QR untuk berdonasi dengan aplikasi pembayaran yang mendukung QRIS.',
                                    qris_merchant: 'MUSHOLA AL MUHAJIRIN',
                                    qris_nmid: 'ID1024347808734',
                                    qris_gambar: '/images/qris/qris-mushola-al-muhajirin.jpg',
                                    tampil_qris: 1,
                                    qris_status: 'Menunggu QRIS resmi',
                                    qris_keterangan_status: 'QRIS belum diaktifkan untuk pembayaran sampai status dan keabsahannya dikonfirmasi oleh pengelola.'
                                };

                                const pengaturanDonasi = (!errPengaturan && rowsPengaturan && rowsPengaturan.length > 0)
                                    ? rowsPengaturan[0]
                                    : defaultDonasi;

                                // ===========================
                                // HITUNG JUMLAH DATA
                                // ===========================

                                const jumlahTransaksiUang = transaksi.length;
                                const jumlahDonasiBarang = donasi.length;
                                const jumlahInventaris = aset.length;
                                const totalAktivitas =
                                    jumlahTransaksiUang +
                                    jumlahDonasiBarang +
                                    jumlahInventaris;

                                // =============================
                                // GABUNGKAN AKTIVITAS TERAKHIR
                                // =============================

                                let aktivitas = [];

                                // transaksi uang
                                transaksi.forEach(item => {
                                    aktivitas.push({
                                        tipe: "transaksi",
                                        tanggal: item.tanggal,
                                        judul: item.kategori_nama,
                                        subjudul:
                                            item.metode === "tunai"
                                            ? "Tunai"
                                            : "Transfer",
                                        nominal: item.nominal,
                                        jenis: item.jenis
                                    });
                                });

                                // donasi barang
                                donasi.forEach(item => {
                                    aktivitas.push({
                                        tipe: "donasi",
                                        tanggal: item.tanggal,
                                        judul: item.nama_barang,
                                        subjudul: item.nama_donatur,
                                        jumlah:
                                            item.jumlah + " " + item.satuan
                                    });
                                });

                                // inventaris
                                aset.forEach(item => {
                                    aktivitas.push({
                                        tipe: "inventaris",
                                        tanggal: item.tanggal_masuk,
                                        judul: item.nama_aset,
                                        subjudul: item.lokasi,
                                        kondisi: item.kondisi
                                    });
                                });

                                // urutkan terbaru
                                aktivitas.sort((a,b)=>{
                                    return new Date(b.tanggal)-new Date(a.tanggal);
                                });

                                // hanya tampilkan 5
                                aktivitas = aktivitas.slice(0,5);

                                db.query("SELECT COUNT(*) AS total FROM master_blok WHERE aktif = 1", (errBlok, rowsBlok) => {
                                    const totalMasterBlokAktif = (rowsBlok && rowsBlok[0]) ? rowsBlok[0].total : 0;

                                    res.render("laporan", {
                                        data: transaksi,
                                        aset,
                                        donasi,
                                        aktivitas,
                                        masuk: ringkasanSaldo.totalMasuk,
                                        keluar: ringkasanSaldo.totalKeluar,
                                        saldo: ringkasanSaldo.saldoTotal,
                                        saldoTotal: ringkasanSaldo.saldoTotal,
                                        saldoTunai: ringkasanSaldo.saldoTunai,
                                        saldoNonTunai: ringkasanSaldo.saldoNonTunai,
                                        mulai,
                                        sampai,
                                        jumlahTransaksiUang,
                                        jumlahDonasiBarang,
                                        jumlahInventaris,
                                        totalAktivitas,
                                        pengaturanDonasi,
                                        totalMasterBlokAktif
                                    });
                                });

                            } // tutup callback pengaturan_donasi
                        );

                    }   // tutup callback donasi
                );      // tutup db.query donasi
            }           // tutup callback aset
        );              // tutup db.query aset
    });                 // tutup callback transaksi
    } catch (errCatch) {
        console.error("Error pada renderLaporanPage:", errCatch);
        return res.status(500).send("Terjadi kesalahan pada server saat memuat laporan.");
    }
}

router.get("/", renderLaporanPage);

// ======================================
// HELPER VALIDASI & QUERY EKSPOR
// ======================================

function validateExportParams(query) {
    const rawMulai = query.mulai || query.startDate;
    const rawSampai = query.sampai || query.endDate;
    const jenisData = (query.jenisData || query.jenis || "semua").toLowerCase();
    const metode = (query.metode || "semua").toLowerCase();

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    let mulai = null;
    let sampai = null;

    if (rawMulai && typeof rawMulai === "string" && rawMulai.trim()) {
        const trimmed = rawMulai.trim();
        if (!dateRegex.test(trimmed) || isNaN(new Date(trimmed).getTime())) {
            return { error: "Format tanggal awal tidak valid. Gunakan format YYYY-MM-DD." };
        }
        mulai = trimmed;
    }

    if (rawSampai && typeof rawSampai === "string" && rawSampai.trim()) {
        const trimmed = rawSampai.trim();
        if (!dateRegex.test(trimmed) || isNaN(new Date(trimmed).getTime())) {
            return { error: "Format tanggal akhir tidak valid. Gunakan format YYYY-MM-DD." };
        }
        sampai = trimmed;
    }

    if (mulai && sampai && mulai > sampai) {
        return { error: "Tanggal awal tidak boleh lebih besar daripada tanggal akhir." };
    }

    const validJenis = ["semua", "uang", "donasi", "aset"];
    const safeJenis = validJenis.includes(jenisData) ? jenisData : "semua";

    const validMetode = ["semua", "tunai", "transfer"];
    const safeMetode = validMetode.includes(metode) ? metode : "semua";

    return {
        mulai,
        sampai,
        jenisData: safeJenis,
        metode: safeMetode
    };
}

async function fetchExportData({ mulai, sampai, jenisData, metode }) {
    const results = {
        transaksi: [],
        donasi: [],
        aset: []
    };

    // 1. Fetch Transaksi (jika jenisData == 'semua' atau 'uang')
    if (jenisData === "semua" || jenisData === "uang") {
        let sql = `
            SELECT
                transaksi.*,
                kategori.nama AS kategori_nama,
                rekening.bank,
                rekening.no_rekening
            FROM transaksi
            LEFT JOIN kategori ON transaksi.kategori_id = kategori.id
            LEFT JOIN rekening ON transaksi.rekening_id = rekening.id
            WHERE 1=1
        `;
        const params = [];

        if (mulai && sampai) {
            sql += ` AND transaksi.tanggal BETWEEN ? AND ?`;
            params.push(mulai, sampai);
        } else if (mulai) {
            sql += ` AND transaksi.tanggal >= ?`;
            params.push(mulai);
        } else if (sampai) {
            sql += ` AND transaksi.tanggal <= ?`;
            params.push(sampai);
        }

        if (metode === "tunai" || metode === "transfer") {
            sql += ` AND LOWER(transaksi.metode) = ?`;
            params.push(metode);
        }

        sql += ` ORDER BY transaksi.tanggal DESC, transaksi.id DESC`;

        results.transaksi = await new Promise((resolve, reject) => {
            db.query(sql, params, (err, rows) => {
                if (err) return reject(err);
                resolve(rows || []);
            });
        });
    }

    // 2. Fetch Donasi Barang (jika jenisData == 'semua' atau 'donasi')
    if (jenisData === "semua" || jenisData === "donasi") {
        let sql = `SELECT * FROM donasi_barang WHERE 1=1`;
        const params = [];

        if (mulai && sampai) {
            sql += ` AND tanggal BETWEEN ? AND ?`;
            params.push(mulai, sampai);
        } else if (mulai) {
            sql += ` AND tanggal >= ?`;
            params.push(mulai);
        } else if (sampai) {
            sql += ` AND tanggal <= ?`;
            params.push(sampai);
        }

        sql += ` ORDER BY tanggal DESC, id DESC`;

        results.donasi = await new Promise((resolve, reject) => {
            db.query(sql, params, (err, rows) => {
                if (err) return reject(err);
                resolve(rows || []);
            });
        });
    }

    // 3. Fetch Aset (jika jenisData == 'semua' atau 'aset')
    if (jenisData === "semua" || jenisData === "aset") {
        let sql = `SELECT * FROM aset WHERE 1=1`;
        const params = [];

        if (mulai && sampai) {
            sql += ` AND tanggal_masuk BETWEEN ? AND ?`;
            params.push(mulai, sampai);
        } else if (mulai) {
            sql += ` AND tanggal_masuk >= ?`;
            params.push(mulai);
        } else if (sampai) {
            sql += ` AND tanggal_masuk <= ?`;
            params.push(sampai);
        }

        sql += ` ORDER BY tanggal_masuk DESC, id DESC`;

        results.aset = await new Promise((resolve, reject) => {
            db.query(sql, params, (err, rows) => {
                if (err) return reject(err);
                resolve(rows || []);
            });
        });
    }

    return results;
}

// ======================================
// EXPORT EXCEL
// ======================================

router.get("/excel", async (req, res) => {
    try {
        const validated = validateExportParams(req.query);
        if (validated.error) {
            return res.status(400).send(`Permintaan ekspor Excel tidak valid: ${validated.error}`);
        }

        const data = await fetchExportData(validated);
        const filename = exportService.buildExportFilename("xlsx", validated);

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${filename}"`
        );

        const workbook = await exportService.generateExcel(data, validated);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error("Export Excel error:", err);
        res.status(500).send("Terjadi kesalahan saat memproses ekspor Excel.");
    }
});

// ======================================
// EXPORT PDF
// ======================================

router.get("/pdf", async (req, res) => {
    try {
        const validated = validateExportParams(req.query);
        if (validated.error) {
            return res.status(400).send(`Permintaan ekspor PDF tidak valid: ${validated.error}`);
        }

        const data = await fetchExportData(validated);
        const filename = exportService.buildExportFilename("pdf", validated);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${filename}"`
        );

        exportService.generatePDF(data, validated, res);
    } catch (err) {
        console.error("Export PDF error:", err);
        res.status(500).send("Terjadi kesalahan saat memproses ekspor PDF.");
    }
});

// ======================================
// LEGACY / SHORTCUT EXPORT ROUTES
// ======================================

router.get("/inventaris/pdf", (req, res) => {
    const q = new URLSearchParams(req.query);
    q.set("jenisData", "aset");
    res.redirect(`/laporan/pdf?${q.toString()}`);
});

router.get("/donasi/pdf", (req, res) => {
    const q = new URLSearchParams(req.query);
    q.set("jenisData", "donasi");
    res.redirect(`/laporan/pdf?${q.toString()}`);
});

module.exports = router;
module.exports.renderLaporanPage = renderLaporanPage;

