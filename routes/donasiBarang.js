const express = require("express");
const router = express.Router();
const db = require("../config/db");

/* ==========================================
   LIST DONASI BARANG
========================================== */

router.get("/", (req, res) => {

    db.query(
        `
        SELECT *
        FROM donasi_barang
        ORDER BY id DESC
        `,
        (err, rows) => {

            if (err) {
                console.log(err);
                return res.send(err.sqlMessage);
            }

            res.render("donasiBarang", {
                data: rows
            });

        }
    );

});


/* ==========================================
   SIMPAN DONASI BARANG
========================================== */

router.post("/simpan", (req, res) => {

    const {

        tanggal,
        nama_donatur,
        nama_barang,
        kategori,
        jumlah,
        satuan,
        kondisi,
        estimasi_harga,
        keterangan

    } = req.body;

    const sql = `
        INSERT INTO donasi_barang
        (
            tanggal,
            nama_donatur,
            nama_barang,
            kategori,
            jumlah,
            satuan,
            kondisi,
            estimasi_harga,
            keterangan
        )
        VALUES (?,?,?,?,?,?,?,?,?)
    `;

    db.query(
        sql,
        [
            tanggal,
            nama_donatur,
            nama_barang,
            kategori,
            jumlah,
            satuan,
            kondisi,
            estimasi_harga || 0,
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


/* ==========================================
   EDIT DONASI BARANG
========================================== */

router.get("/edit/:id", (req, res) => {

    db.query(
        "SELECT * FROM donasi_barang WHERE id=?",
        [req.params.id],
        (err, hasil) => {

            if (err) {
                console.log(err);
                return res.send(err.sqlMessage);
            }

            if (hasil.length === 0) {
                return res.redirect("/transaksi");
            }

            res.render("donasiBarang/edit", {

                data: hasil[0]

            });

        }

    );

});

/* ==========================================
   UPDATE DONASI BARANG
========================================== */

router.post("/update/:id", (req, res) => {

    const {

        tanggal,
        nama_donatur,
        nama_barang,
        kategori,
        jumlah,
        satuan,
        kondisi,
        estimasi_harga,
        keterangan

    } = req.body;

    db.query(
        `
        UPDATE donasi_barang
        SET
            tanggal=?,
            nama_donatur=?,
            nama_barang=?,
            kategori=?,
            jumlah=?,
            satuan=?,
            kondisi=?,
            estimasi_harga=?,
            keterangan=?
        WHERE id=?
        `,
        [
            tanggal,
            nama_donatur,
            nama_barang,
            kategori,
            jumlah,
            satuan,
            kondisi,
            estimasi_harga,
            keterangan,
            req.params.id
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


/* ==========================================
   HAPUS DONASI BARANG
========================================== */

router.get("/hapus/:id", (req, res) => {

    db.query(
        "DELETE FROM donasi_barang WHERE id=?",
        [req.params.id],
        (err) => {

            if (err) {
                console.log(err);
            }

            res.redirect("/transaksi");

        }
    );

});


module.exports = router;