
const express = require("express");
const router = express.Router();

const db = require("../config/db");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

// ======================================
// HALAMAN LAPORAN
// ======================================

router.get("/", (req, res) => {

    const { mulai, sampai } = req.query;

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

        let masuk = 0;
        let keluar = 0;

        transaksi.forEach(item => {

            if (item.jenis === "masuk")
                masuk += Number(item.nominal);

            if (item.jenis === "keluar")
                keluar += Number(item.nominal);

        });

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

res.render("laporan", {

    data: transaksi,

    aset,

    donasi,

    aktivitas,

    masuk,

    keluar,

    saldo: masuk-keluar,

    mulai,

    sampai,

    jumlahTransaksiUang,
    jumlahDonasiBarang,
    jumlahInventaris,
    totalAktivitas

});


 }   // tutup callback donasi

                );      // tutup db.query donasi

            }           // tutup callback aset

        );              // tutup db.query aset

    }                   // tutup callback transaksi

);                      // tutup db.query transaksi

});                     // tutup router.get("/")

// ======================================
// EXPORT EXCEL
// ======================================

router.get("/excel", async (req, res) => {

    try {

        const workbook = new ExcelJS.Workbook();

        // ==========================
        // SHEET 1 TRANSAKSI
        // ==========================

        const transaksiSheet = workbook.addWorksheet("Transaksi");

        const transaksi = await new Promise((resolve, reject) => {

            db.query(`
                SELECT
                    transaksi.*,
                    kategori.nama AS kategori_nama
                FROM transaksi
                LEFT JOIN kategori
                ON transaksi.kategori_id = kategori.id
                ORDER BY transaksi.tanggal DESC
            `, (err, rows) => {

                if (err) return reject(err);

                resolve(rows);

            });

        });

        transaksiSheet.columns = [

            { header: "Tanggal", key: "tanggal", width: 20 },
            { header: "Kategori", key: "kategori", width: 25 },
            { header: "Jenis", key: "jenis", width: 15 },
            { header: "Metode", key: "metode", width: 18 },
            { header: "Nominal", key: "nominal", width: 20 },
            { header: "Keterangan", key: "keterangan", width: 45 }

        ];

        transaksi.forEach(item => {

            transaksiSheet.addRow({

                tanggal: new Date(item.tanggal).toLocaleDateString("id-ID"),

                kategori: item.kategori_nama,

                jenis: item.jenis,

                metode: item.metode,

                nominal: item.nominal,

                keterangan: item.keterangan

            });

        });

        // ==========================
        // SHEET 2 INVENTARIS
        // ==========================

        const asetSheet = workbook.addWorksheet("Inventaris");

        const aset = await new Promise((resolve, reject) => {

            db.query(
                `
                SELECT *
                FROM aset
                ORDER BY tanggal_masuk DESC, id DESC
                `,
                (err, rows) => {

                    if (err) return reject(err);

                    resolve(rows);

                }
            );

        });

        asetSheet.columns = [

            { header:"Nama Aset", key:"nama_aset", width:35 },
            { header: "Kategori", key: "kategori", width: 25 },
            { header: "Jumlah", key: "jumlah", width: 12 },
            { header: "Kondisi", key: "kondisi", width: 18 },
            { header: "Lokasi", key: "lokasi", width: 25 },
            { header: "Nilai Estimasi", key: "nilai_estimasi", width: 20 }

        ];

        aset.forEach(item => {

            asetSheet.addRow({

                nama_aset: item.nama_aset,

                kategori: item.kategori,

                jumlah: item.jumlah,

                kondisi: item.kondisi,

                lokasi: item.lokasi,

                nilai_estimasi: item.nilai_estimasi

            });

        });

        // ==========================
        // SHEET 3 DONASI
        // ==========================

        const donasiSheet = workbook.addWorksheet("Donasi Barang");

        const donasi = await new Promise((resolve, reject) => {

            db.query(
                `
                SELECT *
                FROM donasi_barang
                ORDER BY tanggal DESC,id DESC
                `,
                (err, rows) => {

                    if (err) return reject(err);

                    resolve(rows);

                }
            );

        });

        donasiSheet.columns = [

            { header: "Tanggal", key: "tanggal", width: 20 },
            { header: "Nama Donatur", key: "nama_donatur", width: 30 },
            { header: "Nama Barang",
    key: "nama_barang",
    width: 35 },
            { header: "Jumlah", key: "jumlah", width: 12 },
            { header: "Keterangan", key: "keterangan", width: 45 }

        ];

        donasi.forEach(item => {

           donasiSheet.addRow({

    tanggal: new Date(item.tanggal).toLocaleDateString("id-ID"),

    nama_donatur: item.nama_donatur,

    nama_barang: item.nama_barang,

    jumlah: item.jumlah,

    keterangan: item.keterangan

});

        });

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            "attachment; filename=Laporan_DKM.xlsx"
        );

        await workbook.xlsx.write(res);

        res.end();

    } catch (err) {

        console.log(err);

        res.send("Export Excel gagal");

    }

});


// ======================================
// EXPORT PDF
// ======================================

router.get("/pdf", (req, res) => {

    db.query(`
        SELECT
            transaksi.*,
            kategori.nama AS kategori_nama
        FROM transaksi
        LEFT JOIN kategori
            ON transaksi.kategori_id = kategori.id
        ORDER BY transaksi.tanggal DESC
    `, (err, rows) => {

        if (err) {
            console.log(err);
            return res.send("Export PDF gagal");
        }

        let masuk = 0;
        let keluar = 0;

        rows.forEach(item => {

            if (item.jenis === "masuk")
                masuk += Number(item.nominal);

            if (item.jenis === "keluar")
                keluar += Number(item.nominal);

        });

        const saldo = masuk - keluar;

        res.setHeader("Content-Type", "application/pdf");

        res.setHeader(
            "Content-Disposition",
            "attachment; filename=Laporan_DKM.pdf"
        );

        const doc = new PDFDocument({
            margin: 40
        });

        doc.pipe(res);

        doc.fontSize(18)
           .text("DKM ITTIHADUL MUHAJIRIN", {
               align: "center"
           });

        doc.moveDown();

        doc.fontSize(14)
           .text("Laporan Keuangan", {
               align: "center"
           });

        doc.moveDown();

        doc.fontSize(11);
        doc.text(`Total Pemasukan : Rp ${masuk.toLocaleString("id-ID")}`);
        doc.text(`Total Pengeluaran : Rp ${keluar.toLocaleString("id-ID")}`);
        doc.text(`Saldo : Rp ${saldo.toLocaleString("id-ID")}`);

        doc.moveDown();

        doc.fontSize(13)
           .text("Daftar Transaksi");

        doc.moveDown(0.5);

        rows.forEach(item => {

            const nominal =
                Number(item.nominal).toLocaleString("id-ID");

            doc.fontSize(10).text(
                `${new Date(item.tanggal).toLocaleDateString("id-ID")} | ${item.kategori_nama} | ${item.jenis.toUpperCase()} | Rp ${nominal}`
            );

        });

        doc.end();

    });

});

// ======================================
// EXPORT INVENTARIS PDF (Opsional)
// ======================================

router.get("/inventaris/pdf", (req, res) => {

    res.send("Fitur export inventaris PDF akan dibuat pada tahap berikutnya.");

});

// ======================================
// EXPORT DONASI PDF (Opsional)
// ======================================

router.get("/donasi/pdf", (req, res) => {

    res.send("Fitur export donasi PDF akan dibuat pada tahap berikutnya.");

});

// ======================================

module.exports = router;

