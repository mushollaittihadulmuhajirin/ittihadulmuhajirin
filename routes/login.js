const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.get("/", (req, res) => {
    res.render("login");
});

router.post("/", (req, res) => {

    console.log(req.body);

    const { username, password } = req.body;

    db.query(
        "SELECT * FROM admin WHERE username=? AND password=?",
        [username, password],
        (err, rows) => {

            if (err) {
                console.log(err);
                return res.send("Error Database");
            }

            if (rows.length === 0) {
                return res.send("Username atau Password salah");
            }

            req.session.user = rows[0];

           res.redirect("/transaksi");
        }
    );

});

router.get("/logout", (req, res) => {

    req.session.destroy(() => {
       res.redirect("/");
    });

});

module.exports = router;