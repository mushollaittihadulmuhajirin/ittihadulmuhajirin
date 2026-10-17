/**
 * services/laporanExportService.js
 * Modul terintegrasi untuk Ekspor PDF & Excel Laporan Keuangan DKM V1
 * Mendukung filter tanggal, jenis data, metode pembayaran, serta multi-page formatting profesional.
 */

const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

/**
 * Format tanggal Indonesia: DD/MM/YYYY
 */
function formatDateIndo(dateVal) {
    if (!dateVal) return "-";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "-";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Format tanggal & waktu lengkap Indonesia
 */
function formatFullDateIndo(date = new Date()) {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const d = new Date(date);
    const dayName = days[d.getDay()];
    const dateNum = d.getDate();
    const monthName = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${dayName}, ${dateNum} ${monthName} ${year} ${hours}:${minutes} WIB`;
}

/**
 * Format nominal Rupiah
 */
function formatRupiah(num) {
    if (num === null || num === undefined || isNaN(num)) return "-";
    return "Rp " + Number(num).toLocaleString("id-ID");
}

/**
 * Membangun nama file ekspor yang informatif dan aman
 */
function buildExportFilename(ext, { jenisData, mulai, sampai, metode }) {
    let jenisPart = "Semua";
    if (jenisData === "uang") jenisPart = "Transaksi_Uang";
    else if (jenisData === "donasi") jenisPart = "Donasi_Barang";
    else if (jenisData === "aset") jenisPart = "Inventaris_Masjid";

    let periodePart = "Semua_Periode";
    if (mulai && sampai) {
        periodePart = `${mulai}_sampai_${sampai}`;
    } else if (mulai) {
        periodePart = `sejak_${mulai}`;
    } else if (sampai) {
        periodePart = `hingga_${sampai}`;
    }

    let metodePart = "";
    if (jenisData === "uang" && (metode === "tunai" || metode === "transfer")) {
        metodePart = `_${metode.toUpperCase()}`;
    }

    return `Laporan_DKM_${jenisPart}${metodePart}_${periodePart}.${ext}`;
}

/**
 * Membangun teks periode laporan
 */
function buildPeriodeText(mulai, sampai) {
    if (mulai && sampai) {
        return `Periode: ${formatDateIndo(mulai)} s/d ${formatDateIndo(sampai)}`;
    } else if (mulai) {
        return `Periode: Sejak ${formatDateIndo(mulai)}`;
    } else if (sampai) {
        return `Periode: Hingga ${formatDateIndo(sampai)}`;
    }
    return "Periode: Semua Data Tercatat";
}

/**
 * ========================================================
 * GENERATOR EXCEL
 * ========================================================
 */
async function generateExcel({ transaksi = [], donasi = [], aset = [] }, options = {}) {
    const { mulai, sampai, jenisData = "semua", metode = "semua" } = options;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "DKM Masjid Ghairu Jami Ittihadul Muhajirin";
    workbook.created = new Date();

    const nowText = formatFullDateIndo();
    const periodeText = buildPeriodeText(mulai, sampai);
    const metodeText = (metode === "tunai" || metode === "transfer") ? `Metode: ${metode.toUpperCase()}` : "";

    // 1. WORKSHEET: TRANSAKSI UANG
    if (jenisData === "semua" || jenisData === "uang") {
        const ws = workbook.addWorksheet("Transaksi Uang", {
            pageSetup: { paperSize: 9, orientation: "landscape" } // A4 Landscape
        });

        // Header Title Block
        ws.mergeCells("A1:F1");
        const cellA1 = ws.getCell("A1");
        cellA1.value = "DKM MASJID GHAIRU JAMI ITTIHADUL MUHAJIRIN";
        cellA1.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FF065F46" } };

        ws.mergeCells("A2:F2");
        const cellA2 = ws.getCell("A2");
        cellA2.value = "LAPORAN RIWAYAT TRANSAKSI KAS";
        cellA2.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FF1E293B" } };

        ws.mergeCells("A3:F3");
        const cellA3 = ws.getCell("A3");
        cellA3.value = `${periodeText}${metodeText ? "   |   " + metodeText : ""}   |   Dicetak: ${nowText}`;
        cellA3.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "FF64748B" } };

        // Hitung Ringkasan
        let masuk = 0, keluar = 0;
        transaksi.forEach(t => {
            if (t.jenis === "masuk") masuk += Number(t.nominal || 0);
            else if (t.jenis === "keluar") keluar += Number(t.nominal || 0);
        });
        const saldo = masuk - keluar;

        ws.mergeCells("A4:F4");
        const cellA4 = ws.getCell("A4");
        cellA4.value = `Ringkasan: Total Pemasukan = Rp ${masuk.toLocaleString("id-ID")}   |   Total Pengeluaran = Rp ${keluar.toLocaleString("id-ID")}   |   Saldo Kas = Rp ${saldo.toLocaleString("id-ID")}`;
        cellA4.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF065F46" } };

        ws.addRow([]); // Baris 5 kosong

        // Table Header (Baris 6)
        const headerRow = ws.addRow(["Tanggal", "Kategori", "Jenis", "Metode", "Nominal (Rp)", "Keterangan"]);
        headerRow.height = 24;
        headerRow.eachCell((cell) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF065F46" } };
            cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.border = {
                top: { style: "thin", color: { argb: "FF064E3B" } },
                bottom: { style: "thin", color: { argb: "FF064E3B" } }
            };
        });

        // Set Freeze Pane & AutoFilter
        ws.views = [{ state: "frozen", ySplit: 6 }];
        ws.autoFilter = "A6:F6";

        // Data Rows
        if (transaksi.length > 0) {
            transaksi.forEach((item, idx) => {
                const isEven = idx % 2 === 1;
                const r = ws.addRow([
                    formatDateIndo(item.tanggal),
                    item.kategori_nama || "-",
                    item.jenis === "masuk" ? "Pemasukan" : "Pengeluaran",
                    item.metode === "tunai" ? "Tunai" : (item.metode === "transfer" ? "Transfer" : (item.metode || "-")),
                    Number(item.nominal || 0),
                    item.keterangan || "-"
                ]);

                r.height = 20;
                r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
                r.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(5).alignment = { horizontal: "right", vertical: "middle" };
                r.getCell(5).numFmt = "[$Rp-421] #,##0";
                r.getCell(6).alignment = { horizontal: "left", vertical: "middle" };

                // Warna jenis
                if (item.jenis === "masuk") {
                    r.getCell(3).font = { color: { argb: "FF059669" }, bold: true };
                    r.getCell(5).font = { color: { argb: "FF059669" }, bold: true };
                } else {
                    r.getCell(3).font = { color: { argb: "FFDC2626" }, bold: true };
                    r.getCell(5).font = { color: { argb: "FFDC2626" }, bold: true };
                }

                if (isEven) {
                    r.eachCell({ includeEmpty: true }, (cell) => {
                        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
                    });
                }

                r.eachCell({ includeEmpty: true }, (cell) => {
                    cell.border = {
                        top: { style: "thin", color: { argb: "FFE2E8F0" } },
                        bottom: { style: "thin", color: { argb: "FFE2E8F0" } }
                    };
                });
            });
        } else {
            const emptyRow = ws.addRow(["Tidak ada data transaksi untuk kriteria yang dipilih.", "", "", "", "", ""]);
            ws.mergeCells(`A${emptyRow.number}:F${emptyRow.number}`);
            emptyRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
            emptyRow.getCell(1).font = { italic: true, color: { argb: "FF64748B" } };
            emptyRow.height = 24;
        }

        // Column Widths
        ws.columns = [
            { width: 16 }, // Tanggal
            { width: 25 }, // Kategori
            { width: 16 }, // Jenis
            { width: 16 }, // Metode
            { width: 22 }, // Nominal
            { width: 45 }  // Keterangan
        ];
    }

    // 2. WORKSHEET: DONASI BARANG
    if (jenisData === "semua" || jenisData === "donasi") {
        const ws = workbook.addWorksheet("Donasi Barang", {
            pageSetup: { paperSize: 9, orientation: "landscape" }
        });

        // Title Block
        ws.mergeCells("A1:F1");
        const cellA1 = ws.getCell("A1");
        cellA1.value = "DKM MASJID GHAIRU JAMI ITTIHADUL MUHAJIRIN";
        cellA1.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FF065F46" } };

        ws.mergeCells("A2:F2");
        const cellA2 = ws.getCell("A2");
        cellA2.value = "LAPORAN DATA DONASI BARANG";
        cellA2.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FF1E293B" } };

        ws.mergeCells("A3:F3");
        const cellA3 = ws.getCell("A3");
        cellA3.value = `${periodeText}   |   Dicetak: ${nowText}`;
        cellA3.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "FF64748B" } };

        ws.addRow([]); // Baris 4 kosong

        // Table Header (Baris 5)
        const headerRow = ws.addRow(["Tanggal", "Nama Donatur", "Kategori", "Nama Barang", "Jumlah", "Keterangan"]);
        headerRow.height = 24;
        headerRow.eachCell((cell) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0284C7" } };
            cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.border = {
                top: { style: "thin", color: { argb: "FF0369A1" } },
                bottom: { style: "thin", color: { argb: "FF0369A1" } }
            };
        });

        ws.views = [{ state: "frozen", ySplit: 5 }];
        ws.autoFilter = "A5:F5";

        if (donasi.length > 0) {
            donasi.forEach((item, idx) => {
                const isEven = idx % 2 === 1;
                const r = ws.addRow([
                    formatDateIndo(item.tanggal),
                    item.nama_donatur || "-",
                    item.kategori || "-",
                    item.nama_barang || "-",
                    `${item.jumlah} ${item.satuan || ""}`.trim(),
                    item.keterangan || "-"
                ]);

                r.height = 20;
                r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
                r.getCell(2).font = { bold: true };
                r.getCell(3).alignment = { horizontal: "left", vertical: "middle" };
                r.getCell(4).alignment = { horizontal: "left", vertical: "middle" };
                r.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(5).font = { bold: true };
                r.getCell(6).alignment = { horizontal: "left", vertical: "middle" };

                if (isEven) {
                    r.eachCell({ includeEmpty: true }, (cell) => {
                        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
                    });
                }

                r.eachCell({ includeEmpty: true }, (cell) => {
                    cell.border = {
                        top: { style: "thin", color: { argb: "FFE2E8F0" } },
                        bottom: { style: "thin", color: { argb: "FFE2E8F0" } }
                    };
                });
            });
        } else {
            const emptyRow = ws.addRow(["Tidak ada data donasi barang untuk kriteria yang dipilih.", "", "", "", "", ""]);
            ws.mergeCells(`A${emptyRow.number}:F${emptyRow.number}`);
            emptyRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
            emptyRow.getCell(1).font = { italic: true, color: { argb: "FF64748B" } };
            emptyRow.height = 24;
        }

        ws.columns = [
            { width: 16 }, // Tanggal
            { width: 28 }, // Nama Donatur
            { width: 22 }, // Kategori
            { width: 30 }, // Nama Barang
            { width: 16 }, // Jumlah
            { width: 45 }  // Keterangan
        ];
    }

    // 3. WORKSHEET: INVENTARIS
    if (jenisData === "semua" || jenisData === "aset") {
        const ws = workbook.addWorksheet("Inventaris", {
            pageSetup: { paperSize: 9, orientation: "landscape" }
        });

        // Title Block
        ws.mergeCells("A1:G1");
        const cellA1 = ws.getCell("A1");
        cellA1.value = "DKM MASJID GHAIRU JAMI ITTIHADUL MUHAJIRIN";
        cellA1.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FF065F46" } };

        ws.mergeCells("A2:G2");
        const cellA2 = ws.getCell("A2");
        cellA2.value = "LAPORAN INVENTARIS ASET MASJID";
        cellA2.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FF1E293B" } };

        ws.mergeCells("A3:G3");
        const cellA3 = ws.getCell("A3");
        cellA3.value = `${periodeText}   |   Dicetak: ${nowText}`;
        cellA3.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "FF64748B" } };

        ws.addRow([]); // Baris 4 kosong

        // Table Header (Baris 5)
        const headerRow = ws.addRow(["Tanggal", "Nama Barang", "Kategori", "Jumlah", "Satuan", "Kondisi", "Nilai Estimasi (Rp)", "Keterangan"]);
        headerRow.height = 24;
        headerRow.eachCell((cell) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD97706" } };
            cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.border = {
                top: { style: "thin", color: { argb: "FFB45309" } },
                bottom: { style: "thin", color: { argb: "FFB45309" } }
            };
        });

        ws.views = [{ state: "frozen", ySplit: 5 }];
        ws.autoFilter = "A5:H5";

        if (aset.length > 0) {
            aset.forEach((item, idx) => {
                const isEven = idx % 2 === 1;
                const hasEstimasi = item.nilai_estimasi && Number(item.nilai_estimasi) > 0;
                const r = ws.addRow([
                    formatDateIndo(item.tanggal_masuk),
                    item.nama_aset || "-",
                    item.kategori || "-",
                    item.jumlah !== null && item.jumlah !== undefined ? Number(item.jumlah) : "-",
                    item.satuan || "-",
                    item.kondisi || "-",
                    hasEstimasi ? Number(item.nilai_estimasi) : "-",
                    item.keterangan || "-"
                ]);

                r.height = 20;
                r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
                r.getCell(2).font = { bold: true };
                r.getCell(3).alignment = { horizontal: "left", vertical: "middle" };
                r.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
                r.getCell(7).alignment = { horizontal: "right", vertical: "middle" };
                if (hasEstimasi) {
                    r.getCell(7).numFmt = "[$Rp-421] #,##0";
                }
                r.getCell(8).alignment = { horizontal: "left", vertical: "middle", wrapText: true };

                if (isEven) {
                    r.eachCell({ includeEmpty: true }, (cell) => {
                        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
                    });
                }

                r.eachCell({ includeEmpty: true }, (cell) => {
                    cell.border = {
                        top: { style: "thin", color: { argb: "FFE2E8F0" } },
                        bottom: { style: "thin", color: { argb: "FFE2E8F0" } }
                    };
                });
            });
        } else {
            const emptyRow = ws.addRow(["Tidak ada data inventaris untuk kriteria yang dipilih.", "", "", "", "", "", "", ""]);
            ws.mergeCells(`A${emptyRow.number}:H${emptyRow.number}`);
            emptyRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
            emptyRow.getCell(1).font = { italic: true, color: { argb: "FF64748B" } };
            emptyRow.height = 24;
        }

        ws.columns = [
            { width: 15 }, // Tanggal
            { width: 30 }, // Nama Barang
            { width: 20 }, // Kategori
            { width: 10 }, // Jumlah
            { width: 12 }, // Satuan
            { width: 14 }, // Kondisi
            { width: 20 }, // Nilai Estimasi
            { width: 34 }  // Keterangan
        ];
    }

    return workbook;
}

/**
 * ========================================================
 * GENERATOR PDF (PDFKit)
 * ========================================================
 */
function generatePDF({ transaksi = [], donasi = [], aset = [] }, options = {}, stream) {
    const { mulai, sampai, jenisData = "semua", metode = "semua" } = options;

    const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margins: { top: 36, bottom: 20, left: 36, right: 36 },
        bufferPages: true
    });

    doc.pipe(stream);

    const nowText = formatFullDateIndo();
    const periodeText = buildPeriodeText(mulai, sampai);
    const metodeText = (metode === "tunai" || metode === "transfer") ? `Metode: ${metode.toUpperCase()}` : "";

    let docTitle = "LAPORAN KEUANGAN & INVENTARIS MASJID";
    if (jenisData === "uang") docTitle = "LAPORAN KEUANGAN & RIWAYAT TRANSAKSI KAS";
    else if (jenisData === "donasi") docTitle = "LAPORAN DATA DONASI BARANG";
    else if (jenisData === "aset") docTitle = "LAPORAN INVENTARIS ASET MASJID";

    // 1. DOKUMEN HEADER
    doc.font("Helvetica-Bold").fontSize(15).fillColor("#065F46").text("DKM MASJID GHAIRU JAMI ITTIHADUL MUHAJIRIN", { align: "center" });
    doc.moveDown(0.2);
    doc.font("Helvetica-Bold").fontSize(11.5).fillColor("#1E293B").text(docTitle, { align: "center" });
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(8.5).fillColor("#64748B").text(`${periodeText}${metodeText ? "   |   " + metodeText : ""}   |   Dicetak: ${nowText}`, { align: "center" });
    doc.moveDown(0.4);

    const lineY = doc.y;
    doc.strokeColor("#065F46").lineWidth(1.75).moveTo(36, lineY).lineTo(doc.page.width - 36, lineY).stroke();
    doc.y = lineY + 10;

    // 2. KARTU RINGKASAN KEUANGAN (Hanya jika jenisData == 'semua' atau 'uang')
    if (jenisData === "semua" || jenisData === "uang") {
        let masuk = 0, keluar = 0;
        transaksi.forEach(t => {
            if (t.jenis === "masuk") masuk += Number(t.nominal || 0);
            else if (t.jenis === "keluar") keluar += Number(t.nominal || 0);
        });
        const saldo = masuk - keluar;

        const boxWidth = (doc.page.width - 72 - 20) / 3;
        const boxHeight = 36;
        const startX = 36;
        const startY = doc.y;

        const boxes = [
            { label: "TOTAL PEMASUKAN", amount: `+ Rp ${masuk.toLocaleString("id-ID")}`, bg: "#ECFDF5", border: "#A7F3D0", textCol: "#059669" },
            { label: "TOTAL PENGELUARAN", amount: `- Rp ${keluar.toLocaleString("id-ID")}`, bg: "#FEF2F2", border: "#FECACA", textCol: "#DC2626" },
            { label: "SALDO KAS MASJID", amount: `Rp ${saldo.toLocaleString("id-ID")}`, bg: "#EFF6FF", border: "#BFDBFE", textCol: "#2563EB" }
        ];

        boxes.forEach((b, i) => {
            const bx = startX + i * (boxWidth + 10);
            doc.roundedRect(bx, startY, boxWidth, boxHeight, 4).fillAndStroke(b.bg, b.border);
            doc.font("Helvetica-Bold").fontSize(7).fillColor("#64748B").text(b.label, bx + 10, startY + 5, { width: boxWidth - 20 });
            doc.font("Helvetica-Bold").fontSize(10.5).fillColor(b.textCol).text(b.amount, bx + 10, startY + 16, { width: boxWidth - 20 });
        });

        doc.y = startY + boxHeight + 12;
    }

    // 3. TABLE DRAWING ENGINE
    const maxY = 540;

    function drawTableSection(sectionTitle, bannerColor, columns, rows, emptyMsg) {
        function checkPageBreak(neededHeight) {
            if (doc.y + neededHeight > maxY) {
                doc.addPage();
                doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#065F46").text(`DKM ITTIHADUL MUHAJIRIN  —  ${sectionTitle} (Lanjutan)`, 36, 36);
                doc.y = 50;
                drawTableHeader();
            }
        }

        function drawTableHeader() {
            const hY = doc.y;
            doc.rect(36, hY, doc.page.width - 72, 18).fill(bannerColor || "#065F46");
            let curX = 36;
            columns.forEach(col => {
                doc.font("Helvetica-Bold").fontSize(7.8).fillColor("#FFFFFF").text(
                    col.header,
                    curX + 4,
                    hY + 5,
                    { width: col.width - 8, align: col.align || "left" }
                );
                curX += col.width;
            });
            doc.y = hY + 18;
        }

        // Section Title
        checkPageBreak(50);
        doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#1E293B").text(sectionTitle, 36, doc.y);
        doc.moveDown(0.3);

        drawTableHeader();

        if (!rows || rows.length === 0) {
            const emptyY = doc.y;
            doc.rect(36, emptyY, doc.page.width - 72, 20).fillAndStroke("#FFFFFF", "#E2E8F0");
            doc.font("Helvetica-Oblique").fontSize(8).fillColor("#64748B").text(emptyMsg || "Tidak ada data.", 36, emptyY + 5, { align: "center", width: doc.page.width - 72 });
            doc.y = emptyY + 20 + 12;
            return;
        }

        rows.forEach((row, rIdx) => {
            let maxCellH = 12;
            row.cells.forEach((c, cIdx) => {
                const w = columns[cIdx].width - 8;
                const h = doc.heightOfString(String(c.text || "-"), { width: w, fontSize: 7.5 });
                if (h > maxCellH) maxCellH = h;
            });
            const rowH = Math.max(15, maxCellH + 5);

            checkPageBreak(rowH);

            const rY = doc.y;
            const bg = rIdx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
            doc.rect(36, rY, doc.page.width - 72, rowH).fillAndStroke(bg, "#E2E8F0");

            let curX = 36;
            row.cells.forEach((c, cIdx) => {
                const col = columns[cIdx];
                const textCol = c.color || (col.defaultColor || "#1E293B");
                doc.font(c.bold ? "Helvetica-Bold" : "Helvetica").fontSize(7.5).fillColor(textCol).text(
                    String(c.text || "-"),
                    curX + 4,
                    rY + 3,
                    { width: col.width - 8, align: col.align || "left" }
                );
                curX += col.width;
            });

            doc.y = rY + rowH;
        });

        doc.y += 12;
    }

    // A. Tabel Transaksi Uang (770 pt)
    if (jenisData === "semua" || jenisData === "uang") {
        const uangCols = [
            { header: "Tanggal", width: 75, align: "center" },
            { header: "Kategori", width: 125, align: "left" },
            { header: "Jenis", width: 75, align: "center" },
            { header: "Metode", width: 65, align: "center" },
            { header: "Nominal", width: 120, align: "right" },
            { header: "Keterangan", width: 310, align: "left" }
        ];

        const uangRows = transaksi.map(t => ({
            cells: [
                { text: formatDateIndo(t.tanggal) },
                { text: t.kategori_nama || "-" },
                { text: t.jenis === "masuk" ? "Pemasukan" : "Pengeluaran", color: t.jenis === "masuk" ? "#059669" : "#DC2626", bold: true },
                { text: t.metode === "tunai" ? "Tunai" : (t.metode === "transfer" ? "Transfer" : (t.metode || "-")) },
                { text: (t.jenis === "masuk" ? "+ " : "- ") + formatRupiah(t.nominal), color: t.jenis === "masuk" ? "#059669" : "#DC2626", bold: true },
                { text: t.keterangan || "-" }
            ]
        }));

        drawTableSection("RIWAYAT TRANSAKSI UANG", "#065F46", uangCols, uangRows, "Tidak ada data transaksi untuk periode ini.");
    }

    // B. Tabel Donasi Barang (770 pt)
    if (jenisData === "semua" || jenisData === "donasi") {
        const donasiCols = [
            { header: "Tanggal", width: 75, align: "center" },
            { header: "Nama Donatur", width: 140, align: "left" },
            { header: "Kategori", width: 110, align: "left" },
            { header: "Nama Barang", width: 135, align: "left" },
            { header: "Jumlah", width: 80, align: "center" },
            { header: "Keterangan", width: 230, align: "left" }
        ];

        const donasiRows = donasi.map(d => ({
            cells: [
                { text: formatDateIndo(d.tanggal) },
                { text: d.nama_donatur || "-", bold: true },
                { text: d.kategori || "-" },
                { text: d.nama_barang || "-" },
                { text: `${d.jumlah} ${d.satuan || ""}`.trim(), bold: true },
                { text: d.keterangan || "-" }
            ]
        }));

        drawTableSection("DATA DONASI BARANG", "#0284C7", donasiCols, donasiRows, "Tidak ada data donasi barang untuk periode ini.");
    }

    // C. Tabel Inventaris Masjid (770 pt)
    if (jenisData === "semua" || jenisData === "aset") {
        const asetCols = [
            { header: "Tanggal", width: 68, align: "center" },
            { header: "Nama Barang", width: 140, align: "left" },
            { header: "Kategori", width: 100, align: "left" },
            { header: "Jumlah", width: 45, align: "center" },
            { header: "Satuan", width: 55, align: "center" },
            { header: "Kondisi", width: 65, align: "center" },
            { header: "Nilai Estimasi", width: 105, align: "right" },
            { header: "Keterangan", width: 192, align: "left" }
        ];

        const asetRows = aset.map(a => ({
            cells: [
                { text: formatDateIndo(a.tanggal_masuk) },
                { text: a.nama_aset || "-", bold: true },
                { text: a.kategori || "-" },
                { text: a.jumlah !== null && a.jumlah !== undefined ? String(a.jumlah) : "-" },
                { text: a.satuan || "-" },
                { text: a.kondisi || "-" },
                { text: (a.nilai_estimasi && Number(a.nilai_estimasi) > 0) ? formatRupiah(a.nilai_estimasi) : "-" },
                { text: a.keterangan || "-" }
            ]
        }));

        drawTableSection("INVENTARIS MASJID", "#D97706", asetCols, asetRows, "Tidak ada data inventaris untuk periode ini.");
    }

    // 4. FOOTER DENGAN NOMOR HALAMAN (Tanpa trigger halaman kosong)
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        const oldBottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        doc.font("Helvetica").fontSize(7.5).fillColor("#64748B").text(
            `Halaman ${i + 1} dari ${range.count}   •   Dokumen Resmi DKM Masjid Ghairu Jami Ittihadul Muhajirin   •   Dicetak: ${nowText}`,
            36,
            doc.page.height - 20,
            { align: "center", width: doc.page.width - 72, lineBreak: false }
        );
        doc.page.margins.bottom = oldBottom;
    }

    doc.end();
}

module.exports = {
    formatDateIndo,
    formatFullDateIndo,
    formatRupiah,
    buildExportFilename,
    buildPeriodeText,
    generateExcel,
    generatePDF
};

