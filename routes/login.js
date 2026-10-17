const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../config/db");

router.get("/", (req, res) => {
    res.render("login");
});

router.post("/", (req, res) => {

    const { username, password } = req.body;

    db.query(
        "SELECT * FROM admin WHERE username=?",
        [username],
        async (err, rows) => {

            if (err) {
                console.log(err);
                return res.send("Error Database");
            }

            if (rows.length === 0) {
                return res.send("Username atau Password salah");
            }

            const admin = rows[0];

            let cocok = false;

            // Support password lama (plaintext)
            if (admin.password === password) {
                cocok = true;
            } else {
                try {
                    cocok = await bcrypt.compare(
                        password,
                        admin.password
                    );
                } catch (e) {
                    console.log(e);
                }
            }

            if (!cocok) {
                return res.send("Username atau Password salah");
            }

            req.session.user = {
                id: admin.id,
                username: admin.username
            };

            if (typeof req.session.save === "function") {
                req.session.save((saveErr) => {
                    if (saveErr) {
                        console.error("Session save error:", saveErr);
                    }
                    res.redirect("/transaksi");
                });
            } else {
                res.redirect("/transaksi");
            }

        }
    );

});

router.get("/logout", (req, res) => {
    if (req.session && typeof req.session.destroy === "function") {
        req.session.destroy(() => {
            res.clearCookie("dkm_session");
            res.clearCookie("dkm_session.sig");
            res.clearCookie("connect.sid");
            res.redirect("/");
        });
    } else {
        req.session = null;
        res.clearCookie("dkm_session");
        res.clearCookie("dkm_session.sig");
        res.clearCookie("connect.sid");
        res.redirect("/");
    }
});

module.exports = router;