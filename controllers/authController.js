const bcrypt = require("bcrypt");
const db = require("../config/db");

// ===============================
// FORM UBAH PASSWORD & KONTAK PEMULIHAN
// ===============================
exports.formUbahPassword = (req, res) => {
    if (!req.session?.user) {
        return res.redirect("/login");
    }

    const adminId = req.session.user.id;
    db.query(
        "SELECT id, username, email, no_hp FROM admin WHERE id = ?",
        [adminId],
        (err, rows) => {
            const admin = (rows && rows.length > 0) ? rows[0] : {};
            let successMsg = null;
            let errorMsg = req.query.error || null;
            if (req.query.pesan === "kontak_sukses") {
                successMsg = "Kontak pemulihan akun berhasil diperbarui.";
            }

            res.render("ubah-password", {
                title: "Ubah Password Admin",
                error: errorMsg,
                success: successMsg,
                username: admin.username || req.session.user.username || "admin",
                email: admin.email || "",
                no_hp: admin.no_hp || ""
            });
        }
    );
};

// ===============================
// SIMPAN PASSWORD BARU
// ===============================
exports.simpanPassword = async (req, res) => {
    if (!req.session?.user) {
        if (req.headers.accept?.includes("application/json")) {
            return res.status(401).json({ success: false, message: "Sesi telah berakhir. Silakan login kembali." });
        }
        return res.redirect("/login");
    }

    const {
        password_lama,
        password_baru,
        konfirmasi
    } = req.body;

    const wantsJson = req.headers.accept?.includes("application/json") || req.xhr;

    function sendError(message, status = 400) {
        if (wantsJson) {
            return res.status(status).json({ success: false, message });
        }
        return res.status(status).render("ubah-password", {
            title: "Ubah Password Admin",
            error: message,
            success: null,
            username: req.session.user.username || "admin",
            email: "",
            no_hp: ""
        });
    }

    // 1. Validasi Input Wajib Diisi
    if (!password_lama || !password_baru || !konfirmasi) {
        return sendError("Semua field (password lama, password baru, dan konfirmasi) wajib diisi.");
    }

    // 2. Validasi Panjang Password Baru
    if (password_baru.length < 6) {
        return sendError("Password baru harus memiliki panjang minimal 6 karakter.");
    }

    // 3. Validasi Kesesuaian Konfirmasi
    if (password_baru !== konfirmasi) {
        return sendError("Konfirmasi password baru tidak cocok dengan password baru.");
    }

    const adminId = req.session.user.id;

    // 4. Cari Admin di Database
    db.query(
        "SELECT id, username, password FROM admin WHERE id=?",
        [adminId],
        async (err, rows) => {
            if (err) {
                console.error("Database error during password change:", err.message);
                return sendError("Terjadi kesalahan pada database.", 500);
            }

            if (!rows || rows.length === 0) {
                return sendError("Akun admin tidak ditemukan.", 404);
            }

            const admin = rows[0];
            let cocok = false;

            // 5. Verifikasi Password Lama (Mendukung legacy plaintext dan bcrypt hash)
            if (admin.password === password_lama) {
                cocok = true;
            } else {
                try {
                    cocok = await bcrypt.compare(password_lama, admin.password);
                } catch (e) {
                    console.error("Bcrypt compare error:", e.message);
                }
            }

            if (!cocok) {
                return sendError("Password lama yang Anda masukkan salah.");
            }

            // 6. Enkripsi Password Baru dengan Bcrypt
            try {
                const hash = await bcrypt.hash(password_baru, 10);

                // 7. Simpan Hash ke Database
                db.query(
                    "UPDATE admin SET password=? WHERE id=?",
                    [hash, adminId],
                    (updateErr) => {
                        if (updateErr) {
                            console.error("Gagal update password di database:", updateErr.message);
                            return sendError("Gagal menyimpan password baru.", 500);
                        }

                        console.log(`🔒 [AUTH] Password berhasil diperbarui untuk admin ID: ${adminId}`);

                        if (wantsJson) {
                            return res.json({
                                success: true,
                                message: "Password berhasil diubah. Silakan login kembali dengan password baru."
                            });
                        }

                        // Sesi diakhiri agar admin login ulang dengan password baru
                        req.session.destroy(() => {
                            return res.redirect("/login?pesan=sukses_ubah_password");
                        });
                    }
                );
            } catch (hashErr) {
                console.error("Bcrypt hash error:", hashErr.message);
                return sendError("Gagal mengenkripsi password baru.", 500);
            }
        }
    );
};