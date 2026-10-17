const express = require("express");
const router = express.Router();
const db = require("../config/db");

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
   LIST INVENTARIS MASJID (GET /)
====================================================== */
router.get("/", checkLogin, (req, res) => {
    // 1. Ringkasan Aset
    const sqlSummary = `
        SELECT
            COUNT(*) AS total_aset,
            COALESCE(SUM(jumlah), 0) AS total_barang,
            COALESCE(SUM(nilai_estimasi), 0) AS nilai_aset
        FROM aset
    `;

    db.query(sqlSummary, (errSummary, summaryRows) => {
        if (errSummary) {
            console.error("Gagal mengambil ringkasan aset:", errSummary);
        }

        const total_aset = summaryRows?.[0]?.total_aset || 0;
        const total_barang = summaryRows?.[0]?.total_barang || 0;
        const nilai_aset = summaryRows?.[0]?.nilai_aset || 0;

        // 2. Kategori Inventaris
        const sqlKategori = `SELECT * FROM kategori WHERE tipe='inventaris' ORDER BY nama ASC`;

        db.query(sqlKategori, (errKategori, kategoriRows) => {
            const kategori = kategoriRows || [];

            // 3. Daftar Aset
            const sqlAset = `SELECT * FROM aset ORDER BY tanggal_masuk DESC, id DESC`;

            db.query(sqlAset, (errAset, asetRows) => {
                if (errAset) {
                    console.error("Gagal mengambil daftar aset:", errAset);
                    return res.status(500).send("Gagal memuat inventaris");
                }

                res.render("aset", {
                    data: asetRows || [],
                    kategori,
                    total_aset,
                    total_barang,
                    nilai_aset
                });
            });
        });
    });
});

/* ======================================================
   SIMPAN INVENTARIS (POST /simpan & POST /tambah)
====================================================== */
const handlerSimpan = (req, res) => {
    const {
        tanggal_masuk,
        nama_aset,
        nama_barang,
        kategori,
        jumlah,
        satuan,
        kondisi,
        lokasi,
        nilai_estimasi,
        keterangan
    } = req.body;

    const nama = (nama_aset || nama_barang || "").trim();
    if (!nama) {
        return res.status(400).send("Nama aset wajib diisi.");
    }

    const sql = `
        INSERT INTO aset
        (
            nama_aset,
            kategori,
            jumlah,
            satuan,
            kondisi,
            lokasi,
            nilai_estimasi,
            tanggal_masuk,
            keterangan
        )
        VALUES (?,?,?,?,?,?,?,?,?)
    `;

    db.query(
        sql,
        [
            nama,
            kategori || null,
            jumlah ? Number(jumlah) : 1,
            satuan || "Unit",
            kondisi || "Baik",
            lokasi || null,
            nilai_estimasi ? Number(nilai_estimasi) : 0,
            tanggal_masuk || null,
            keterangan || null
        ],
        (err) => {
            if (err) {
                console.error("Gagal simpan aset:", err);
                return res.send(err.sqlMessage || err.message);
            }
            res.redirect("/aset");
        }
    );
};

router.post("/simpan", checkLogin, handlerSimpan);
router.post("/tambah", checkLogin, handlerSimpan);

/* ======================================================
   FORM EDIT INVENTARIS (GET /edit/:id)
====================================================== */
router.get("/edit/:id", checkLogin, (req, res) => {
    db.query(
        "SELECT * FROM aset WHERE id=?",
        [req.params.id],
        (err, hasil) => {
            if (err) {
                console.error("Gagal mengambil aset:", err);
                return res.send(err.sqlMessage || err.message);
            }

            if (hasil.length === 0) {
                return res.redirect("/aset");
            }

            db.query(
                "SELECT * FROM kategori WHERE tipe='inventaris' ORDER BY nama ASC",
                (errKat, kategori) => {
                    res.render("aset_edit", {
                        data: hasil[0],
                        kategori: kategori || [],
                        actionUrl: `/aset/update/${hasil[0].id}`,
                        backUrl: "/aset"
                    });
                }
            );
        }
    );
});

/* ======================================================
   UPDATE INVENTARIS (POST /update/:id)
====================================================== */
router.post("/update/:id", checkLogin, (req, res) => {
    const id = req.params.id;
    const {
        tanggal_masuk,
        nama_aset,
        nama_barang,
        kategori,
        jumlah,
        satuan,
        kondisi,
        lokasi,
        nilai_estimasi,
        keterangan
    } = req.body;

    const nama = (nama_aset || nama_barang || "").trim();

    const sql = `
        UPDATE aset
        SET
            tanggal_masuk=?,
            nama_aset=?,
            kategori=?,
            jumlah=?,
            satuan=?,
            kondisi=?,
            lokasi=?,
            nilai_estimasi=?,
            keterangan=?
        WHERE id=?
    `;

    db.query(
        sql,
        [
            tanggal_masuk || null,
            nama,
            kategori || null,
            jumlah ? Number(jumlah) : 1,
            satuan || "Unit",
            kondisi || "Baik",
            lokasi || null,
            nilai_estimasi ? Number(nilai_estimasi) : 0,
            keterangan || null,
            id
        ],
        (err) => {
            if (err) {
                console.error("Gagal update aset:", err);
                return res.send(err.sqlMessage || err.message);
            }
            res.redirect("/aset");
        }
    );
});

/* ======================================================
   HAPUS INVENTARIS (GET /hapus/:id)
====================================================== */
router.get("/hapus/:id", checkLogin, (req, res) => {
    db.query(
        "DELETE FROM aset WHERE id=?",
        [req.params.id],
        (err) => {
            if (err) {
                console.error("Gagal hapus aset:", err);
                return res.send(err.sqlMessage || err.message);
            }
            res.redirect("/aset");
        }
    );
});

module.exports = router;