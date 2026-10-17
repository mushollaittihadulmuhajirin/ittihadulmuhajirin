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
// Backup Manual & Download Langsung ke Perangkat (POST & GET Direct)
// =========================
router.post(
    "/download",
    checkLogin,
    backupController.backupDownload
);

router.get(
    "/download-direct",
    checkLogin,
    backupController.backupDownload
);

// =========================
// Backup Sekarang (Kompatibilitas)
// =========================
router.post(
    "/now",
    checkLogin,
    backupController.backupNow
);

// =========================
// List Backup Sementara
// =========================
router.get(
    "/list",
    checkLogin,
    backupController.listBackup
);

// =========================
// Download Backup File Tertentu
// =========================
router.get(
    "/download/:fileName",
    checkLogin,
    backupController.downloadBackup
);

module.exports = router;