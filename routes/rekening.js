const express = require("express");
const router = express.Router();

const db = require("../config/db");

/* ==========================================================
   MIDDLEWARE LOGIN
========================================================== */

function checkLogin(req, res, next) {

    if (!req.session.user) {
        return res.redirect("/login");
    }

    next();

}

/* ==========================================================
   LIST REKENING
========================================================== */

router.get("/", checkLogin, (req, res) => {

    const sql = `
        SELECT *
        FROM rekening
        ORDER BY bank ASC,
                 nama_pemilik ASC
    `;

    db.query(sql, (err, rows) => {

        if (err) {
            console.log(err);
            return res.send("Gagal mengambil data rekening");
        }

        res.render("rekening", {
            data: rows
        });

    });

});

/* ==========================================================
   SIMPAN REKENING
========================================================== */

router.post("/simpan", checkLogin, (req, res) => {

    const {
        bank,
        no_rekening,
        nama_pemilik
    } = req.body;

    const sql = `
        INSERT INTO rekening
        (
            bank,
            no_rekening,
            nama_pemilik
        )
        VALUES (?,?,?)
    `;

    db.query(
        sql,
        [
            bank,
            no_rekening,
            nama_pemilik
        ],
        (err) => {

            if (err) {

                console.log(err);

                return res.send(err.sqlMessage);

            }

            res.redirect("/rekening");

        }

    );

});

/* ==========================================================
   FORM EDIT
========================================================== */

router.get("/edit/:id", checkLogin, (req, res) => {

    const sql = `
        SELECT *
        FROM rekening
        WHERE id=?
        LIMIT 1
    `;

    db.query(sql, [req.params.id], (err, rows) => {

        if (err) {

            console.log(err);

            return res.send(err.sqlMessage);

        }

        if (rows.length === 0) {

            return res.redirect("/rekening");

        }

        res.render("edit_rekening", {

            data: rows[0]

        });

    });

});

/* ==========================================================
   UPDATE
========================================================== */

router.post("/update/:id", checkLogin, (req, res) => {

    const {
        bank,
        no_rekening,
        nama_pemilik
    } = req.body;

    const sql = `
        UPDATE rekening
        SET
            bank=?,
            no_rekening=?,
            nama_pemilik=?
        WHERE id=?
    `;

    db.query(
        sql,
        [
            bank,
            no_rekening,
            nama_pemilik,
            req.params.id
        ],
        (err) => {

            if (err) {

                console.log(err);

                return res.send(err.sqlMessage);

            }

            res.redirect("/rekening");

        }

    );

});

/* ==========================================================
   HAPUS
========================================================== */

router.get("/hapus/:id", checkLogin, (req, res) => {

    db.query(
        "DELETE FROM rekening WHERE id=?",
        [req.params.id],
        (err) => {

            if (err) {

                console.log(err);

                return res.send(err.sqlMessage);

            }

            res.redirect("/rekening");

        }

    );

});

/* ==========================================================
   EXPORT
========================================================== */

module.exports = router;