const express = require("express");
const router = express.Router();

const db = require("../config/db");


// ======================================
// MIDDLEWARE LOGIN
// ======================================
function checkLogin(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    return res.redirect("/login");
}

// tampil kategori
router.get("/", checkLogin, (req, res) => {

    db.query(
        "SELECT * FROM kategori ORDER BY id DESC",
        (err, rows) => {

            if (err) {
                console.log(err);
                return res.send("Error Database");
            }

            res.render("kategori", {
                data: rows,
                user: req.session.user
            });

        }
    );

});


// simpan kategori
router.post("/simpan", checkLogin, (req, res) => {

    const { nama, tipe } = req.body;

    db.query(
        "INSERT INTO kategori (nama, tipe) VALUES (?, ?)",
        [nama, tipe],
        (err) => {

            if (err) {
                console.log(err);
                return res.send(err.sqlMessage);
            }

            res.redirect("/kategori");

        }
    );

});


// hapus
router.get("/hapus/:id", checkLogin, (req, res) => {

    db.query(
        "DELETE FROM kategori WHERE id=?",
        [req.params.id],
        () => {
            res.redirect("/kategori");
        }
    );

});


module.exports = router;