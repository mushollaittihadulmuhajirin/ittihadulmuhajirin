const crypto = require("crypto");
const bcrypt = require("bcrypt");
const db = require("../config/db");

// In-memory rate limiting map: identifier/IP -> timestamps array
const rateLimitMap = new Map();

/**
 * Normalisasi nomor HP ke format standar internasional (+62...)
 */
function normalizePhone(input) {
    if (!input) return "";
    let clean = input.toString().trim().replace(/[\s\-\(\)]/g, "");
    if (clean.startsWith("+62")) {
        return clean;
    }
    if (clean.startsWith("62")) {
        return "+" + clean;
    }
    if (clean.startsWith("0")) {
        return "+62" + clean.substring(1);
    }
    if (clean.startsWith("8")) {
        return "+62" + clean;
    }
    return clean;
}

/**
 * Validasi format email
 */
function isValidEmail(email) {
    if (!email || typeof email !== "string") return false;
    const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
    return re.test(email.trim());
}

/**
 * Validasi format nomor HP Indonesia (+628xxxxxxxxxx, minimal 10 digit, maks 15)
 */
function isValidPhone(phone) {
    const norm = normalizePhone(phone);
    const re = /^\+628[1-9][0-9]{7,11}$/;
    return re.test(norm);
}

/**
 * Memeriksa Rate Limit (Maksimal 3 permintaan per 15 menit)
 */
function isRateLimited(key, maxRequests = 3, windowMs = 15 * 60 * 1000) {
    const now = Date.now();
    const timestamps = rateLimitMap.get(key) || [];
    const recent = timestamps.filter(t => now - t < windowMs);

    if (recent.length >= maxRequests) {
        return true;
    }

    recent.push(now);
    rateLimitMap.set(key, recent);
    return false;
}

/**
 * Status konfigurasi provider layanan eksternal
 */
function getProviderStatus() {
    const smtpAvailable = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
    const waAvailable = Boolean(process.env.FONNTE_TOKEN || process.env.WA_API_KEY);

    return {
        email: {
            configured: smtpAvailable,
            service: smtpAvailable ? "Custom SMTP" : "Belum Dikonfigurasi (Simulasi Lokal Aman)"
        },
        whatsapp: {
            configured: waAvailable,
            service: waAvailable ? "WhatsApp Gateway API" : "Belum Dikonfigurasi (Simulasi Lokal Aman)"
        }
    };
}

/**
 * Mengirim permintaan pemulihan password
 */
function requestRecovery(method, identifier, ip) {
    return new Promise(async (resolve, reject) => {
        try {
            // 1. Cek Rate Limit IP & Identifier
            if (isRateLimited(`req_${ip}`, 5) || isRateLimited(`id_${identifier}`, 3)) {
                return resolve({
                    success: false,
                    rateLimited: true,
                    message: "Terlalu banyak percobaan permintaan pemulihan. Silakan tunggu 15 menit sebelum mencoba kembali."
                });
            }

            let normalizedIdentifier = identifier.trim();
            let querySql = "";
            let queryParam = "";

            if (method === "email") {
                if (!isValidEmail(normalizedIdentifier)) {
                    return resolve({
                        success: false,
                        invalidFormat: true,
                        message: "Format alamat email tidak valid."
                    });
                }
                querySql = "SELECT id, username, email FROM admin WHERE LOWER(email) = LOWER(?) LIMIT 1";
                queryParam = normalizedIdentifier;
            } else if (method === "no_hp") {
                const normPhone = normalizePhone(normalizedIdentifier);
                if (!isValidPhone(normPhone)) {
                    return resolve({
                        success: false,
                        invalidFormat: true,
                        message: "Format nomor HP tidak valid. Masukkan nomor HP/WhatsApp Indonesia yang aktif (contoh: 081234567890)."
                    });
                }
                normalizedIdentifier = normPhone;
                // Cocokkan format di database (baik yang tersimpan +62, 62, atau 08)
                const phoneVariations = [
                    normPhone,
                    normPhone.replace("+", ""),
                    "0" + normPhone.substring(3)
                ];
                querySql = "SELECT id, username, no_hp FROM admin WHERE no_hp IN (?, ?, ?) LIMIT 1";
                queryParam = phoneVariations;
            } else {
                return resolve({
                    success: false,
                    message: "Metode pemulihan tidak valid. Pilih Email atau Nomor HP."
                });
            }

            // 2. Query Akun Admin
            db.query(
                querySql,
                Array.isArray(queryParam) ? queryParam : [queryParam],
                async (err, rows) => {
                    if (err) {
                        console.error("[RECOVERY] Database query error:", err.message);
                        return reject(err);
                    }

                    // NETRAL: Jika akun tidak ditemukan, respons tetap aman & positif (anti user enumeration)
                    if (!rows || rows.length === 0) {
                        return resolve({
                            success: true,
                            neutral: true,
                            method,
                            message: "Jika data yang Anda masukkan terdaftar dan terverifikasi pada sistem, instruksi pemulihan telah diproses. Untuk alasan keamanan, sistem tidak mengonfirmasi status akun secara publik."
                        });
                    }

                    const admin = rows[0];
                    const adminId = admin.id;

                    // 3. Batalkan token pemulihan sebelumnya yang masih aktif untuk admin ini
                    db.query(
                        "UPDATE password_resets SET used = 1 WHERE admin_id = ? AND used = 0",
                        [adminId],
                        async (cancelErr) => {
                            if (cancelErr) {
                                console.error("[RECOVERY] Error canceling older resets:", cancelErr.message);
                            }

                            // 4. Generate Kriptografis Token / OTP
                            let rawToken = "";
                            let tokenHash = "";
                            const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 Menit

                            if (method === "email") {
                                rawToken = crypto.randomBytes(32).toString("hex");
                                tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
                            } else {
                                // 6-digit OTP
                                rawToken = crypto.randomInt(100000, 999999).toString();
                                tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
                            }

                            // 5. Simpan Hash Token ke Tabel password_resets
                            db.query(
                                `INSERT INTO password_resets (admin_id, method, identifier, token_hash, expires_at, attempts, used)
                                 VALUES (?, ?, ?, ?, ?, 0, 0)`,
                                [adminId, method, normalizedIdentifier, tokenHash, expiresAt],
                                (insertErr, result) => {
                                    if (insertErr) {
                                        console.error("[RECOVERY] Insert reset error:", insertErr.message);
                                        return reject(insertErr);
                                    }

                                    const resetId = result.insertId;
                                    const providerStatus = getProviderStatus();

                                    // 6. Logging Aman untuk Lingkungan Lokal / Simulasi
                                    if (process.env.NODE_ENV !== "production") {
                                        if (method === "email") {
                                            const devResetUrl = `http://localhost:3000/reset-password?token=${rawToken}`;
                                            console.log(`\n📧 [DEV MOCK EMAIL SERVICE]`);
                                            console.log(`Tujuan: ${normalizedIdentifier}`);
                                            console.log(`Tautan Reset (Berlaku 15 Menit): ${devResetUrl}`);
                                            console.log(`Token Hash (SHA-256 tersimpan): ${tokenHash.substring(0, 16)}...\n`);
                                        } else {
                                            console.log(`\n📱 [DEV MOCK WHATSAPP/SMS OTP SERVICE]`);
                                            console.log(`Tujuan: ${normalizedIdentifier}`);
                                            console.log(`Kode Verifikasi OTP: ${rawToken} (Berlaku 15 Menit)`);
                                            console.log(`Reset ID: ${resetId}\n`);
                                        }
                                    }

                                    return resolve({
                                        success: true,
                                        neutral: false,
                                        method,
                                        resetId,
                                        providerConfigured: method === "email" ? providerStatus.email.configured : providerStatus.whatsapp.configured,
                                        devRawToken: process.env.NODE_ENV !== "production" ? rawToken : null,
                                        message: method === "email"
                                            ? "Tautan pemulihan password telah dikirim ke email terdaftar Anda. Tautan hanya berlaku selama 15 menit."
                                            : "Kode OTP verifikasi telah dikirim ke nomor WhatsApp/HP terdaftar Anda. Kode hanya berlaku selama 15 menit."
                                    });
                                }
                            );
                        }
                    );
                }
            );
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Verifikasi Validitas Token Reset Email
 */
function verifyResetToken(rawToken) {
    return new Promise((resolve) => {
        if (!rawToken || typeof rawToken !== "string") {
            return resolve({ valid: false, message: "Token tidak diberikan atau format tidak valid." });
        }

        const tokenHash = crypto.createHash("sha256").update(rawToken.trim()).digest("hex");

        db.query(
            `SELECT r.*, a.username 
             FROM password_resets r
             JOIN admin a ON r.admin_id = a.id
             WHERE r.token_hash = ? AND r.used = 0 AND r.expires_at > NOW()
             LIMIT 1`,
            [tokenHash],
            (err, rows) => {
                if (err) {
                    console.error("[RECOVERY] Verify token db error:", err.message);
                    return resolve({ valid: false, message: "Kesalahan internal basis data." });
                }

                if (!rows || rows.length === 0) {
                    return resolve({
                        valid: false,
                        message: "Tautan pemulihan tidak valid, telah digunakan, atau telah kedaluwarsa. Silakan ajukan permohonan baru."
                    });
                }

                return resolve({
                    valid: true,
                    resetRow: rows[0],
                    adminId: rows[0].admin_id,
                    username: rows[0].username
                });
            }
        );
    });
}

/**
 * Reset Password Menggunakan Token Email yang Valid
 */
function resetPasswordByToken(rawToken, newPassword, confirmPassword) {
    return new Promise(async (resolve) => {
        if (!newPassword || newPassword.length < 6) {
            return resolve({ success: false, message: "Password baru harus memiliki panjang minimal 6 karakter." });
        }
        if (newPassword !== confirmPassword) {
            return resolve({ success: false, message: "Konfirmasi password baru tidak cocok." });
        }

        const check = await verifyResetToken(rawToken);
        if (!check.valid) {
            return resolve({ success: false, message: check.message });
        }

        try {
            const hash = await bcrypt.hash(newPassword, 10);
            const adminId = check.adminId;
            const resetId = check.resetRow.id;

            db.query(
                "UPDATE admin SET password = ? WHERE id = ?",
                [hash, adminId],
                (upErr) => {
                    if (upErr) {
                        console.error("[RECOVERY] Update admin password error:", upErr.message);
                        return resolve({ success: false, message: "Gagal memperbarui password di database." });
                    }

                    // Tandai token sebagai used = 1
                    db.query(
                        "UPDATE password_resets SET used = 1 WHERE id = ?",
                        [resetId],
                        (tokenErr) => {
                            if (tokenErr) console.error("[RECOVERY] Invalidate token error:", tokenErr.message);
                            console.log(`🔒 [RECOVERY] Password admin (ID: ${adminId}) berhasil direset via email token.`);
                            return resolve({
                                success: true,
                                message: "Password baru berhasil disimpan. Silakan masuk menggunakan kata sandi baru."
                            });
                        }
                    );
                }
            );
        } catch (e) {
            console.error("[RECOVERY] Hash error:", e.message);
            return resolve({ success: false, message: "Terjadi kesalahan saat mengenkripsi kata sandi." });
        }
    });
}

/**
 * Verifikasi Kode OTP Nomor HP dan Reset Password
 */
function verifyOtpAndReset(resetId, rawOtp, newPassword, confirmPassword) {
    return new Promise(async (resolve) => {
        if (!resetId || !rawOtp) {
            return resolve({ success: false, message: "ID pemulihan dan kode OTP wajib diisi." });
        }

        if (!newPassword || newPassword.length < 6) {
            return resolve({ success: false, message: "Password baru harus memiliki panjang minimal 6 karakter." });
        }

        if (newPassword !== confirmPassword) {
            return resolve({ success: false, message: "Konfirmasi password baru tidak cocok." });
        }

        db.query(
            `SELECT r.*, a.username 
             FROM password_resets r
             JOIN admin a ON r.admin_id = a.id
             WHERE r.id = ? AND r.used = 0 AND r.expires_at > NOW()
             LIMIT 1`,
            [resetId],
            async (err, rows) => {
                if (err) {
                    console.error("[RECOVERY] Verify OTP db error:", err.message);
                    return resolve({ success: false, message: "Kesalahan basis data." });
                }

                if (!rows || rows.length === 0) {
                    return resolve({
                        success: false,
                        message: "Sesi verifikasi OTP tidak ditemukan atau sudah kedaluwarsa. Silakan ajukan kode baru."
                    });
                }

                const resetRecord = rows[0];

                // Batas maksimal 3 kali percobaan salah
                if (resetRecord.attempts >= 3) {
                    // Kunci token
                    db.query("UPDATE password_resets SET used = 1 WHERE id = ?", [resetId]);
                    return resolve({
                        success: false,
                        locked: true,
                        message: "Batas percobaan OTP terlampaui (maksimal 3 kali). Permohonan ini telah dibatalkan demi keamanan. Silakan minta kode baru."
                    });
                }

                const inputHash = crypto.createHash("sha256").update(rawOtp.toString().trim()).digest("hex");

                if (inputHash !== resetRecord.token_hash) {
                    const newAttempts = resetRecord.attempts + 1;
                    const remaining = 3 - newAttempts;
                    db.query("UPDATE password_resets SET attempts = ? WHERE id = ?", [newAttempts, resetId]);

                    return resolve({
                        success: false,
                        attemptsRemaining: remaining,
                        message: remaining > 0
                            ? `Kode OTP salah. Sisa kesempatan: ${remaining} kali.`
                            : "Kode OTP salah. Batas percobaan habis. Silakan ajukan kode baru."
                    });
                }

                // OTP Cocok -> Simpan password baru
                try {
                    const hash = await bcrypt.hash(newPassword, 10);
                    db.query(
                        "UPDATE admin SET password = ? WHERE id = ?",
                        [hash, resetRecord.admin_id],
                        (updateErr) => {
                            if (updateErr) {
                                console.error("[RECOVERY] Update password via OTP error:", updateErr.message);
                                return resolve({ success: false, message: "Gagal menyimpan password baru." });
                            }

                            db.query("UPDATE password_resets SET used = 1 WHERE id = ?", [resetId]);
                            console.log(`🔒 [RECOVERY] Password admin (ID: ${resetRecord.admin_id}) berhasil direset via WhatsApp/SMS OTP.`);
                            return resolve({
                                success: true,
                                message: "Verifikasi OTP berhasil dan password baru telah aktif. Silakan login."
                            });
                        }
                    );
                } catch (hashErr) {
                    console.error("[RECOVERY] Hash error:", hashErr.message);
                    return resolve({ success: false, message: "Gagal mengenkripsi kata sandi baru." });
                }
            }
        );
    });
}

/**
 * Pendaftaran & Pembaruan Kontak Pemulihan (Khusus Admin yang Telah Terautentikasi)
 */
function updateAdminRecoveryContacts(adminId, email, phone) {
    return new Promise((resolve) => {
        let cleanEmail = null;
        let cleanPhone = null;

        if (email && email.trim()) {
            if (!isValidEmail(email)) {
                return resolve({ success: false, message: "Format alamat email tidak valid." });
            }
            cleanEmail = email.trim().toLowerCase();
        }

        if (phone && phone.trim()) {
            const norm = normalizePhone(phone);
            if (!isValidPhone(norm)) {
                return resolve({ success: false, message: "Format nomor HP tidak valid. Masukkan nomor HP Indonesia yang aktif (contoh: 081234567890)." });
            }
            cleanPhone = norm;
        }

        const now = new Date();

        db.query(
            `UPDATE admin 
             SET email = ?, 
                 no_hp = ?, 
                 email_verified_at = IF(? IS NOT NULL, ?, email_verified_at),
                 no_hp_verified_at = IF(? IS NOT NULL, ?, no_hp_verified_at)
             WHERE id = ?`,
            [cleanEmail, cleanPhone, cleanEmail, now, cleanPhone, now, adminId],
            (err) => {
                if (err) {
                    console.error("[RECOVERY] Update contacts error:", err.message);
                    return resolve({ success: false, message: "Gagal memperbarui kontak pemulihan di database." });
                }

                console.log(`🔒 [AUTH] Kontak pemulihan admin ID ${adminId} berhasil diperbarui.`);
                return resolve({
                    success: true,
                    message: "Kontak pemulihan berhasil diperbarui.",
                    email: cleanEmail,
                    no_hp: cleanPhone
                });
            }
        );
    });
}

module.exports = {
    normalizePhone,
    isValidEmail,
    isValidPhone,
    isRateLimited,
    getProviderStatus,
    requestRecovery,
    verifyResetToken,
    resetPasswordByToken,
    verifyOtpAndReset,
    updateAdminRecoveryContacts
};

