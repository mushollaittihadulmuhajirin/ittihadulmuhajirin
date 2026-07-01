const express = require("express");
const router = express.Router();
const db = require("../config/db");

/* ======================================================
   SIMPAN INVENTARIS MASJID
====================================================== */

router.post("/simpan", (req, res) => {

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
        VALUES
        (?,?,?,?,?,?,?,?,?)
    `;

    db.query(
        sql,
        [
            nama_barang,
            kategori,
            jumlah,
            satuan,
            kondisi,
            lokasi,
            nilai_estimasi || 0,
            tanggal_masuk,
            keterangan
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
   FORM EDIT INVENTARIS
====================================================== */

router.get("/edit/:id", (req, res) => {

    db.query(
        "SELECT * FROM aset WHERE id=?",
        [req.params.id],
        (err, hasil) => {

            if (err) {
                console.log(err);
                return res.send(err.sqlMessage);
            }

            if (hasil.length === 0) {
                return res.redirect("/transaksi");
            }

            res.render("aset_edit", {
                data: hasil[0]
            });

        }

    );

});

/* ======================================================
   UPDATE INVENTARIS
====================================================== */

router.post("/update/:id", (req, res) => {

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
                return res.send(err.sqlMessage);
            }

            res.redirect("/transaksi");

        }
    );

});


/* ======================================================
   HAPUS INVENTARIS
====================================================== */

router.get("/hapus/:id", (req, res) => {

    db.query(
        "DELETE FROM aset WHERE id=?",
        [req.params.id],
        (err) => {

            if (err) {
                console.log(err);
                return res.send(err.sqlMessage);
            }

            res.redirect("/transaksi");

        }

    );

});

module.exports = router;