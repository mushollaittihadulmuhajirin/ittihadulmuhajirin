const express = require("express");
const router = express.Router();

const db = require("../config/db");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

// ====================
// HALAMAN LAPORAN
// ====================

router.get("/", (req, res) => {

db.query(`
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
    ORDER BY transaksi.id DESC
`, (err, rows) => {

    if (err) {
        console.log(err);
        return res.send("Error Laporan");
    }

    let masuk = 0;
    let keluar = 0;

    rows.forEach(item => {
        if (item.jenis === "masuk") masuk += Number(item.nominal);
        if (item.jenis === "keluar") keluar += Number(item.nominal);
    });

    res.render("laporan", {
        data: rows,
        masuk,
        keluar,
        saldo: masuk - keluar
    });

});

});

// ====================
// EXPORT EXCEL
// ====================

router.get("/excel", (req, res) => {

db.query(`
    SELECT
    transaksi.*,
    kategori.nama AS kategori_nama
    FROM transaksi
    LEFT JOIN kategori
    ON transaksi.kategori_id = kategori.id
    ORDER BY transaksi.id DESC
`, async (err, rows) => {

    if (err) {
        console.log(err);
        return res.send("Error Export Excel");
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Laporan");

    worksheet.columns = [
        { header: "Tanggal", key: "tanggal", width: 20 },
        { header: "Kategori", key: "kategori", width: 25 },
        { header: "Jenis", key: "jenis", width: 15 },
        { header: "Metode", key: "metode", width: 20 },
        { header: "Nominal", key: "nominal", width: 20 },
        { header: "Keterangan", key: "keterangan", width: 40 }
    ];

    rows.forEach(item => {

        worksheet.addRow({
            tanggal: new Date(item.tanggal).toLocaleDateString("id-ID"),
            kategori: item.kategori_nama,
            jenis: item.jenis,
            metode: item.metode,
            nominal: item.nominal,
            keterangan: item.keterangan
        });

    });

    res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
        "Content-Disposition",
        "attachment; filename=LaporanKeuangan.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();

});

});

// ====================
// EXPORT PDF
// ====================

router.get("/pdf", (req, res) => {

db.query(`
    SELECT
    transaksi.*,
    kategori.nama AS kategori_nama
    FROM transaksi
    LEFT JOIN kategori
    ON transaksi.kategori_id = kategori.id
    ORDER BY transaksi.id DESC
`, (err, rows) => {

    if (err) {
        console.log(err);
        return res.send("Error Export PDF");
    }

    let masuk = 0;
    let keluar = 0;

    rows.forEach(item => {
        if (item.jenis === "masuk") masuk += Number(item.nominal);
        if (item.jenis === "keluar") keluar += Number(item.nominal);
    });

    const saldo = masuk - keluar;

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
        "Content-Disposition",
        "attachment; filename=LaporanKeuangan.pdf"
    );

    const doc = new PDFDocument({
        margin: 30
    });

    doc.pipe(res);

    doc.fontSize(18)
        .text("DKM ITTIHADUL MUHAJIRIN", {
            align: "center"
        });

    doc.moveDown();

    doc.text(`Total Masuk : Rp ${masuk.toLocaleString("id-ID")}`);
    doc.text(`Total Keluar : Rp ${keluar.toLocaleString("id-ID")}`);
    doc.text(`Saldo : Rp ${saldo.toLocaleString("id-ID")}`);

    doc.moveDown();
    doc.text("DAFTAR TRANSAKSI");
    doc.moveDown();

    rows.forEach(item => {

        doc.fontSize(10).text(
            `${new Date(item.tanggal).toLocaleDateString("id-ID")} | ${item.kategori_nama} | ${item.jenis} | Rp ${Number(item.nominal).toLocaleString("id-ID")}`
        );

    });

    doc.end();

});

});

module.exports = router;