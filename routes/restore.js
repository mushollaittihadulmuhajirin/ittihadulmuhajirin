const express = require("express");
const multer = require("multer");
const path = require("path");

const router = express.Router();
const restoreController = require("../controllers/restoreController");

// =========================
// Middleware Login
// =========================
function checkLogin(req, res, next) {
    if (!req.session?.user) {
        return res.redirect("/login");
    }

    next();
}

// =========================
// Konfigurasi Upload
// =========================
const upload = multer({

    dest: (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
        ? path.join(require("os").tmpdir(), "temp")
        : path.join(__dirname, "../temp"),

    limits: {
        fileSize: 50 * 1024 * 1024 // 50 MB
    },

    fileFilter(req, file, cb) {

        const ext = path.extname(file.originalname).toLowerCase();

        if (ext !== ".sql") {
            return cb(new Error("Hanya file backup (.sql) yang diperbolehkan."));
        }

        cb(null, true);

    }

});

// =========================
// Halaman Restore
// =========================
router.get(
    "/",
    checkLogin,
    restoreController.index
);

// =========================
// Proses Restore
// =========================
router.post(
    "/process",
    checkLogin,
    (req, res, next) => {

        upload.single("backupFile")(req, res, function (err) {

            if (err instanceof multer.MulterError) {

                return res.status(400).json({
                    success: false,
                    message: err.message
                });

            }

            if (err) {

                return res.status(400).json({
                    success: false,
                    message: err.message
                });

            }

            next();

        });

    },
    restoreController.restoreDatabase
);

module.exports = router;