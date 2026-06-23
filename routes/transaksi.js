const express = require("express");
const router = express.Router();

const db = require("../config/db");

// HALAMAN TRANSAKSI


router.get("/", (req, res) => {

    db.query(
        "SELECT * FROM transaksi ORDER BY id DESC",
        (err, rows) => {

            if (err) {
                console.log(err);
                return res.send("Error Database");
            }


            db.query(
                "SELECT * FROM rekening ORDER BY bank",
                (err2, rekening) => {

                    if (err2) {
                        console.log(err2);
                        return res.send("Error Rekening");
                    }


                    db.query(
                        "SELECT * FROM kategori ORDER BY nama",
                        (err3, kategori) => {

                            if (err3) {
                                console.log(err3);
                                return res.send("Error Kategori");
                            }


                            res.render("transaksi", {
                                data: rows,
                                rekening: rekening,
                                kategori: kategori
                            });


                        }
                    );


                }
            );


        }
    );

});

// SIMPAN TRANSAKSI
router.post("/simpan", (req, res) => {

    const {
        tanggal,
        kategori_id,
        jenis,
        metode,
        rekening_id,
        nominal,
        keterangan
    } = req.body;

    const sql = `
        INSERT INTO transaksi
        (
            tanggal,
            kategori_id,
            jenis,
            metode,
            rekening_id,
            nominal,
            keterangan
        )
        VALUES
        (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            tanggal,
            kategori_id,
            jenis,
            metode,
            rekening_id || null,
            nominal,
            keterangan
        ],
        (err) => {

            if (err) {
                console.log(err);
                return res.send(err);
            }

            res.redirect("/transaksi");

        }
    );

});

// HAPUS TRANSAKSI
router.get("/hapus/:id", (req, res) => {

    db.query(
        "DELETE FROM transaksi WHERE id=?",
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