

require("dotenv").config();

const path = require("path");
const express = require("express");
const cookieSession = require("cookie-session");

const app = express();
const db = require("./config/db");

// =========================
// TRUST PROXY (Vercel Serverless / Reverse Proxy)
// =========================
app.set("trust proxy", 1);

// =========================
// ROUTES
// =========================
const homeRoute = require("./routes/home");
const loginRoute = require("./routes/login");
const dashboardRoute = require("./routes/dashboard");
const laporanRoute = require("./routes/laporan");
const transaksiRoute = require("./routes/transaksi");
const rekeningRoute = require("./routes/rekening");
const kategoriRoute = require("./routes/kategori");
const asetRoute = require("./routes/aset");
const donasiBarangRoute = require("./routes/donasiBarang");
const authRoute = require("./routes/auth");
const backupRoute = require("./routes/backup");
const restoreRoute = require("./routes/restore");
const pengaturanDonasiRoute = require("./routes/pengaturanDonasi");
const saranRoute = require("./routes/saran");
const masterBlokRoute = require("./routes/masterBlok");
const passwordResetRoute = require("./routes/passwordReset");


// =========================
// SESSION (Serverless-compatible Signed Cookie Session)
// =========================
app.use(
    cookieSession({
        name: "dkm_session",
        keys: [process.env.SESSION_SECRET || "dkm-crystal-session-secret-2026-key"],
        maxAge: 1000 * 60 * 60 * 8, // 8 jam
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
    })
);

// Backward-compatibility shims for session.destroy() and session.save()
app.use((req, res, next) => {
    if (req.session) {
        if (!req.session.destroy) {
            req.session.destroy = function (cb) {
                req.session = null;
                if (typeof cb === "function") cb();
            };
        }
        if (!req.session.save) {
            req.session.save = function (cb) {
                if (typeof cb === "function") cb();
            };
        }
    }
    next();
});

// =========================
// VIEW ENGINE
// =========================
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// =========================
// MIDDLEWARE
// =========================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// =========================
// ROUTE
// =========================
app.use("/", homeRoute);
app.use("/login", loginRoute);
app.get("/logout", (req, res) => {
    req.session = null;
    res.clearCookie("dkm_session");
    res.clearCookie("dkm_session.sig");
    res.clearCookie("connect.sid");
    res.redirect("/");
});
app.use("/dashboard", dashboardRoute);
app.use("/laporan", laporanRoute);
app.use("/transaksi", transaksiRoute);
app.use("/rekening", rekeningRoute);
app.use("/kategori", kategoriRoute);
app.use("/aset", asetRoute);
app.use("/donasi-barang", donasiBarangRoute);
app.use("/auth", authRoute);
app.use("/", passwordResetRoute);
app.use("/backup", backupRoute);
app.use("/restore", restoreRoute);
app.use("/pengaturan-donasi", pengaturanDonasiRoute);
app.use("/saran", saranRoute.router);
app.use("/master-blok", masterBlokRoute);
app.get("/api/master-blok", saranRoute.apiMasterBlok);
app.post("/api/saran", saranRoute.apiSimpanSaran);


// =========================
// TEST ROUTE
// =========================
app.get("/test", (req, res) => {
    res.send("TEST BERHASIL");
});

app.get("/dbtest", (req, res) => {

    db.query("SELECT 1 AS test", (err) => {

        if (err) {
            console.log(err);
            return res.send("DB GAGAL");
        }

        res.send("DB BERHASIL");

    });

});

// =========================
// START SERVER
// =========================

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, () => {
        console.log(`Server berjalan di http://localhost:${PORT}`);
    });
}

module.exports = app;