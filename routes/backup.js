const express = require("express");
const router = express.Router();

const backupController = require("../controllers/backupController");

// =========================
// Middleware Login
// =========================
function checkLogin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.redirect("/login");
    }

    next();
}

// =========================
// Halaman Backup
// =========================
router.get(
    "/",
    checkLogin,
    backupController.index
);

// =========================
// Backup Sekarang
// =========================
router.post(
    "/now",
    checkLogin,
    backupController.backupNow
);

// =========================
// List Backup
// =========================
router.get(
    "/list",
    checkLogin,
    backupController.listBackup
);

// =========================
// Download Backup
// =========================
router.get(
    "/download/:fileName",
    checkLogin,
    backupController.downloadBackup
);

module.exports = router;