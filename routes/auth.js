const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const passwordResetController = require("../controllers/passwordResetController");

// =========================
// Middleware Login
// =========================
function checkLogin(req, res, next) {
    if (!req.session?.user) {
        return res.redirect("/login");
    }

    next();
}

router.get("/ubah-password", checkLogin, authController.formUbahPassword);
router.post("/ubah-password", checkLogin, authController.simpanPassword);
router.post("/kontak-pemulihan", checkLogin, passwordResetController.simpanKontakPemulihan);

module.exports = router;