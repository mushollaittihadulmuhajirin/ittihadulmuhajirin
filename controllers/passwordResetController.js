const passwordResetService = require("../services/passwordResetService");
const db = require("../config/db");

// ==========================================
// 1. FORM LUPA PASSWORD (METODE PILIHAN)
// ==========================================
exports.formLupaPassword = (req, res) => {
    const providerStatus = passwordResetService.getProviderStatus();
    res.render("lupa-password", {
        title: "Lupa Password — Panel Admin DKM Crystal",
        error: null,
        success: null,
        neutralNotice: null,
        method: req.query.metode || "email",
        providerStatus,
        devData: null
    });
};

// ==========================================
// 2. PROSES PERMOHONAN LUPA PASSWORD
// ==========================================
exports.prosesLupaPassword = async (req, res) => {
    const { metode, identifier } = req.body;
    const ip = req.ip || req.connection.remoteAddress || "127.0.0.1";
    const providerStatus = passwordResetService.getProviderStatus();

    if (!metode || !["email", "no_hp"].includes(metode)) {
        return res.status(400).render("lupa-password", {
            title: "Lupa Password — Panel Admin DKM Crystal",
            error: "Silakan pilih metode pemulihan yang valid (Email atau Nomor HP).",
            success: null,
            neutralNotice: null,
            method: "email",
            providerStatus,
            devData: null
        });
    }

    if (!identifier || !identifier.trim()) {
        const fieldName = metode === "email" ? "Alamat email" : "Nomor HP / WhatsApp";
        return res.status(400).render("lupa-password", {
            title: "Lupa Password — Panel Admin DKM Crystal",
            error: `${fieldName} wajib diisi.`,
            success: null,
            neutralNotice: null,
            method: metode,
            providerStatus,
            devData: null
        });
    }

    try {
        const result = await passwordResetService.requestRecovery(metode, identifier, ip);

        if (!result.success) {
            return res.status(result.rateLimited ? 429 : 400).render("lupa-password", {
                title: "Lupa Password — Panel Admin DKM Crystal",
                error: result.message,
                success: null,
                neutralNotice: null,
                method: metode,
                providerStatus,
                devData: null
            });
        }

        // Respons Netral (Anti Enumeration) atau jika akun tidak ditemukan
        if (result.neutral) {
            return res.render("lupa-password", {
                title: "Lupa Password — Panel Admin DKM Crystal",
                error: null,
                success: null,
                neutralNotice: result.message,
                method: metode,
                providerStatus,
                devData: null
            });
        }

        // Jika Metode WhatsApp -> arahkan ke formulir input OTP
        if (metode === "no_hp" && result.resetId) {
            return res.redirect(`/verifikasi-otp?id=${result.resetId}`);
        }

        // Metode Email Berhasil
        return res.render("lupa-password", {
            title: "Lupa Password — Panel Admin DKM Crystal",
            error: null,
            success: result.message,
            neutralNotice: null,
            method: metode,
            providerStatus,
            devData: result.devRawToken ? {
                token: result.devRawToken,
                resetUrl: `http://localhost:3000/reset-password?token=${result.devRawToken}`
            } : null
        });
    } catch (err) {
        console.error("[CONTROLLER] Recovery request error:", err);
        return res.status(500).render("lupa-password", {
            title: "Lupa Password — Panel Admin DKM Crystal",
            error: "Terjadi kesalahan internal saat memproses pemulihan kata sandi.",
            success: null,
            neutralNotice: null,
            method: metode || "email",
            providerStatus,
            devData: null
        });
    }
};

// ==========================================
// 3. FORM VERIFIKASI OTP (METODE WHATSAPP / HP)
// ==========================================
exports.formVerifikasiOtp = (req, res) => {
    const resetId = req.query.id;
    if (!resetId) {
        return res.redirect("/lupa-password");
    }

    // Ambil info reset request untuk menampilkan identitas tersensor
    db.query(
        "SELECT id, method, identifier, expires_at, attempts, used FROM password_resets WHERE id = ? LIMIT 1",
        [resetId],
        (err, rows) => {
            if (err || !rows || rows.length === 0 || rows[0].used === 1 || new Date(rows[0].expires_at) < new Date()) {
                return res.render("lupa-password", {
                    title: "Lupa Password — Panel Admin DKM Crystal",
                    error: "Sesi verifikasi OTP tidak valid atau telah kedaluwarsa. Silakan ajukan ulang.",
                    success: null,
                    neutralNotice: null,
                    method: "no_hp",
                    providerStatus: passwordResetService.getProviderStatus(),
                    devData: null
                });
            }

            const record = rows[0];
            // Mask nomor HP (misal: +62812****7890)
            const iden = record.identifier || "";
            const masked = iden.length > 7
                ? iden.substring(0, 5) + "****" + iden.substring(iden.length - 4)
                : iden;

            res.render("verifikasi-otp", {
                title: "Verifikasi OTP WhatsApp — DKM Crystal",
                resetId: record.id,
                maskedPhone: masked,
                error: null,
                success: null,
                remainingAttempts: 3 - record.attempts
            });
        }
    );
};

// ==========================================
// 4. PROSES VERIFIKASI OTP & SIMPAN PASSWORD
// ==========================================
exports.prosesVerifikasiOtp = async (req, res) => {
    const { reset_id, otp, password_baru, konfirmasi } = req.body;

    if (!reset_id || !otp) {
        return res.status(400).render("verifikasi-otp", {
            title: "Verifikasi OTP WhatsApp — DKM Crystal",
            resetId: reset_id,
            maskedPhone: "Nomor Terdaftar",
            error: "Kode OTP wajib diisi lengkap.",
            success: null,
            remainingAttempts: 3
        });
    }

    try {
        const result = await passwordResetService.verifyOtpAndReset(reset_id, otp, password_baru, konfirmasi);

        if (!result.success) {
            return res.status(400).render("verifikasi-otp", {
                title: "Verifikasi OTP WhatsApp — DKM Crystal",
                resetId: reset_id,
                maskedPhone: "Nomor Terdaftar",
                error: result.message,
                success: null,
                remainingAttempts: typeof result.attemptsRemaining !== "undefined" ? result.attemptsRemaining : 0
            });
        }

        // Sukses Reset Password -> Hancurkan session lama jika ada & arahkan ke login
        if (req.session) {
            req.session.destroy(() => {
                res.redirect("/login?pesan=reset_sukses");
            });
        } else {
            res.redirect("/login?pesan=reset_sukses");
        }
    } catch (err) {
        console.error("[CONTROLLER] Verify OTP error:", err);
        return res.status(500).render("verifikasi-otp", {
            title: "Verifikasi OTP WhatsApp — DKM Crystal",
            resetId: reset_id,
            maskedPhone: "Nomor Terdaftar",
            error: "Terjadi kesalahan internal saat memverifikasi kode OTP.",
            success: null,
            remainingAttempts: 3
        });
    }
};

// ==========================================
// 5. FORM RESET PASSWORD BARU (VIA EMAIL TOKEN)
// ==========================================
exports.formResetPassword = async (req, res) => {
    const rawToken = req.query.token;

    if (!rawToken) {
        return res.render("reset-password-invalid", {
            title: "Tautan Tidak Valid — DKM Crystal",
            message: "Parameter tautan pemulihan tidak ditemukan. Pastikan Anda membuka tautan lengkap dari email Anda."
        });
    }

    const check = await passwordResetService.verifyResetToken(rawToken);

    if (!check.valid) {
        return res.render("reset-password-invalid", {
            title: "Tautan Kedaluwarsa / Tidak Valid — DKM Crystal",
            message: check.message
        });
    }

    res.render("reset-password", {
        title: "Buat Password Baru — DKM Crystal",
        token: rawToken,
        username: check.username,
        error: null
    });
};

// ==========================================
// 6. PROSES SIMPAN PASSWORD BARU (VIA EMAIL TOKEN)
// ==========================================
exports.prosesResetPassword = async (req, res) => {
    const { token, password_baru, konfirmasi } = req.body;

    if (!token) {
        return res.status(400).render("reset-password-invalid", {
            title: "Tautan Tidak Valid — DKM Crystal",
            message: "Token pemulihan tidak ditemukan. Silakan ajukan permohonan baru."
        });
    }

    const result = await passwordResetService.resetPasswordByToken(token, password_baru, konfirmasi);

    if (!result.success) {
        return res.status(400).render("reset-password", {
            title: "Buat Password Baru — DKM Crystal",
            token,
            username: "Pengurus DKM",
            error: result.message
        });
    }

    // Sukses -> Hancurkan session lama & arahkan ke login dengan notifikasi sukses
    if (req.session) {
        req.session.destroy(() => {
            res.redirect("/login?pesan=reset_sukses");
        });
    } else {
        res.redirect("/login?pesan=reset_sukses");
    }
};

// ==========================================
// 7. PENGATURAN KONTAK PEMULIHAN ADMIN (AUTH)
// ==========================================
exports.simpanKontakPemulihan = async (req, res) => {
    if (!req.session?.user) {
        return res.redirect("/login");
    }

    const adminId = req.session.user.id;
    const { email, no_hp } = req.body;

    const result = await passwordResetService.updateAdminRecoveryContacts(adminId, email, no_hp);

    const wantsJson = req.headers.accept?.includes("application/json") || req.xhr;
    if (wantsJson) {
        return res.status(result.success ? 200 : 400).json(result);
    }

    if (result.success) {
        return res.redirect("/auth/ubah-password?pesan=kontak_sukses");
    } else {
        return res.redirect(`/auth/ubah-password?error=${encodeURIComponent(result.message)}`);
    }
};

