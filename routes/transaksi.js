const transaksiController = require("../controllers/transaksiController");

const express = require("express");
const router = express.Router();

const db = require("../config/db");

/* ======================================================
   MIDDLEWARE LOGIN
====================================================== */

function checkLogin(req, res, next) {

    if (!req.session.user) {
        return res.redirect("/");
    }

    next();

}

/* ======================================================
   HELPER FORMAT
====================================================== */

function rupiah(angka) {

    return Number(angka || 0);

}
/* ======================================================
   HALAMAN TRANSAKSI
====================================================== */

router.get("/", checkLogin, transaksiController.index);

/* ======================================================
   SIMPAN TRANSAKSI UANG
====================================================== */

router.post(
    "/simpan",
    checkLogin,
    transaksiController.simpan
);

/* ======================================================
   EDIT TRANSAKSI UANG
====================================================== */

router.get("/edit/:id", checkLogin, (req, res) => {

    const id = req.params.id;

    db.query(

        "SELECT * FROM transaksi WHERE id=?",

        [id],

        (err, transaksi) => {

            if (err) {

                console.log(err);
                return res.send("Gagal mengambil transaksi");

            }

            if (!transaksi.length) {

                return res.redirect("/transaksi");

            }

            db.query(

                "SELECT * FROM kategori WHERE tipe='uang' ORDER BY nama ASC",

                (errKategori, kategori) => {

                    if (errKategori) {

                        console.log(errKategori);
                        return res.send("Gagal mengambil kategori");

                    }

                    db.query(

                        "SELECT * FROM rekening ORDER BY bank ASC",

                        (errRekening, rekening) => {

                            if (errRekening) {

                                console.log(errRekening);
                                return res.send("Gagal mengambil rekening");

                            }

                            res.render("transaksi_edit", {

                                data: transaksi[0],
                                kategori,
                                rekening

                            });

                        }

                    );

                }

            );

        }

    );

});
/* ======================================================
   EDIT DONASI BARANG
====================================================== */

router.get("/edit-donasi/:id", checkLogin, (req, res) => {

    const id = req.params.id;

    db.query(

        "SELECT * FROM donasi_barang WHERE id=?",

        [id],

        (err, rows) => {

            if (err) {

                console.log(err);
                return res.send("Gagal mengambil data");

            }

            if (!rows.length) {

                return res.redirect("/transaksi");

            }

            db.query(

                "SELECT * FROM kategori WHERE tipe='donasi' ORDER BY nama ASC",

                (errKategori, kategori) => {

                    if (errKategori) {

                        console.log(errKategori);
                        return res.send("Gagal mengambil kategori");

                    }

                    res.render("donasiBarang/edit", {

                        data: rows[0],
                        kategori

                    });

                }

            );

        }

    );

});

/* ======================================================
   EDIT INVENTARIS
====================================================== */

router.get("/edit-inventaris/:id", checkLogin, (req, res) => {

    const id = req.params.id;

    db.query(

        "SELECT * FROM aset WHERE id=?",

        [id],

        (err, rows) => {

            if (err) {

                console.log(err);
                return res.send("Gagal mengambil inventaris");

            }

            if (!rows.length) {

                return res.redirect("/transaksi");

            }

            db.query(

                "SELECT * FROM kategori WHERE tipe='inventaris' ORDER BY nama ASC",

                (errKategori, kategori) => {

                    if (errKategori) {

                        console.log(errKategori);
                        return res.send("Gagal mengambil kategori");

                    }

                    res.render("aset_edit", {

                        data: rows[0],
                        kategori

                    });

                }

            );

        }

    );

});
/* ======================================================
   UPDATE TRANSAKSI UANG
====================================================== */


/* ======================================================
   UPDATE DONASI BARANG
====================================================== */

router.post("/update-donasi/:id", checkLogin, (req, res) => {

    const id = req.params.id;

    const {

        tanggal,
        nama_donatur,
        kategori,
        nama_barang,
        jumlah,
        satuan,
        kondisi,
        estimasi_harga,
        keterangan

    } = req.body;

    const sql = `
        UPDATE donasi_barang
        SET
            tanggal=?,
            nama_donatur=?,
            kategori=?,
            nama_barang=?,
            jumlah=?,
            satuan=?,
            kondisi=?,
            estimasi_harga=?,
            keterangan=?
        WHERE id=?
    `;

    db.query(

        sql,

        [

            tanggal,
            nama_donatur,
            kategori,
            nama_barang,
            jumlah,
            satuan,
            kondisi,
            estimasi_harga,
            keterangan,
            id

        ],

        (err) => {

            if (err) {

                console.log(err);

                return res.send("Gagal update donasi.");

            }

            return res.redirect("/transaksi");

        }

    );

});

/* ======================================================
   UPDATE TRANSAKSI KEUANGAN
====================================================== */

router.post("/update/:id", checkLogin, (req, res) => {

    const id = req.params.id;

    const {
        tanggal,
        jenis,
        kategori_id,
        metode,
        rekening_id,
        nominal,
        keterangan
    } = req.body;

    const sql = `
        UPDATE transaksi
        SET
            tanggal=?,
            jenis=?,
            kategori_id=?,
            metode=?,
            rekening_id=?,
            nominal=?,
            keterangan=?
        WHERE id=?
    `;

    db.query(
        sql,
        [
            tanggal,
            jenis,
            kategori_id,
            metode,
            metode === "transfer" ? rekening_id : null,
            nominal,
            keterangan,
            id
        ],
        (err) => {

            if (err) {
                console.log(err);
                return res.send(err.sqlMessage);
            }

            res.redirect("/transaksi");

        }
    );

});

/* ======================================================
   UPDATE INVENTARIS
====================================================== */

router.post("/update-inventaris/:id", checkLogin, (req, res) => {

    const id = req.params.id;

    const {

        tanggal_masuk,
        nama_barang,
        kategori,
        jumlah,
        satuan,
        kondisi,
        lokasi,
        nilai_estimasi,
        keterangan

    } = req.body;

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

            tanggal_masuk,
            nama_barang,
            kategori,
            jumlah,
            satuan,
            kondisi,
            lokasi,
            nilai_estimasi,
            keterangan,
            id

        ],

        (err) => {

            if (err) {

                console.log(err);

                return res.send("Gagal update inventaris.");

            }

            return res.redirect("/transaksi");

        }

    );

});


/* ======================================================
   HAPUS TRANSAKSI UANG
====================================================== */

router.get("/hapus/:id", checkLogin, (req, res) => {

    db.query(

        "DELETE FROM transaksi WHERE id=?",

        [req.params.id],

        (err) => {

            if (err) {

                console.log(err);

                return res.send("Gagal menghapus transaksi.");

            }

            return res.redirect("/transaksi");

        }

    );

});


/* ======================================================
   HAPUS DONASI BARANG
====================================================== */

router.get("/hapus-donasi/:id", checkLogin, (req, res) => {

    db.query(

        "DELETE FROM donasi_barang WHERE id=?",

        [req.params.id],

        (err) => {

            if (err) {

                console.log(err);

                return res.send("Gagal menghapus donasi.");

            }

            return res.redirect("/transaksi");

        }

    );

});
/* ======================================================
   HAPUS INVENTARIS
====================================================== */

router.get("/hapus-inventaris/:id", checkLogin, (req, res) => {

    db.query(

        "DELETE FROM aset WHERE id=?",

        [req.params.id],

        (err) => {

            if (err) {

                console.log(err);

                return res.send("Gagal menghapus inventaris.");

            }

            return res.redirect("/transaksi");

        }

    );

});
/* ======================================================
   EXPORT ROUTER
====================================================== */

module.exports = router;