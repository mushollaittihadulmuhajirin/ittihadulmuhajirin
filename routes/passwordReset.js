const express = require("express");
const router = express.Router();
const passwordResetController = require("../controllers/passwordResetController");

// ========================================================
// ROUTE PEMULIHAN KATA SANDI (LUPA PASSWORD)
// ========================================================

// 1. Pilihan Metode Pemulihan (Email / WhatsApp)
router.get("/lupa-password", passwordResetController.formLupaPassword);
router.post("/lupa-password", passwordResetController.prosesLupaPassword);

// 2. Verifikasi Kode OTP (Metode Nomor HP / WhatsApp)
router.get("/verifikasi-otp", passwordResetController.formVerifikasiOtp);
router.post("/verifikasi-otp", passwordResetController.prosesVerifikasiOtp);

// 3. Reset Password Baru via Token (Metode Email)
router.get("/reset-password", passwordResetController.formResetPassword);
router.post("/reset-password", passwordResetController.prosesResetPassword);

module.exports = router;

