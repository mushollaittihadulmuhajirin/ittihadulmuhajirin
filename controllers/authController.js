const bcrypt = require("bcrypt");
const db = require("../config/db");

// ===============================
// FORM
// ===============================

exports.formUbahPassword = (req, res) => {

    if (!req.session.user) {
        return res.redirect("/login");
    }

    res.render("ubah-password");

};

// ===============================
// SIMPAN PASSWORD
// ===============================

exports.simpanPassword = (req, res) => {

    if (!req.session.user) {
        return res.redirect("/login");
    }

    const {
        password_lama,
        password_baru,
        konfirmasi
    } = req.body;

    if (password_baru !== konfirmasi) {

        return res.send("Konfirmasi password tidak sama.");

    }

    const adminId = req.session.user.id;

    db.query(
        "SELECT * FROM admin WHERE id=?",
        [adminId],
        async (err, rows) => {

            if (err) {
                console.log(err);
                return res.send("Database error");
            }

            if (rows.length === 0) {

                return res.send("Admin tidak ditemukan");

            }

            const admin = rows[0];

            let cocok = false;

            // jika password lama masih plaintext
            if (admin.password === password_lama) {

                cocok = true;

            } else {

                try {

                    cocok = await bcrypt.compare(
                        password_lama,
                        admin.password
                    );

                } catch (e) {}

            }

            if (!cocok) {

                return res.send("Password lama salah.");

            }

            const hash = await bcrypt.hash(password_baru, 10);

            db.query(
                "UPDATE admin SET password=? WHERE id=?",
                [hash, adminId],
                (err2) => {

                    if (err2) {

                        console.log(err2);
                        return res.send("Gagal mengubah password");

                    }

                    res.send("Password berhasil diubah.");

                }
            );

        }
    );

};