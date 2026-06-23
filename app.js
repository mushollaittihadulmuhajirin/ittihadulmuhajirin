require("dotenv").config();
const session = require("express-session");
const laporanRoute = require("./routes/laporan");
const express = require("express");
const loginRoute = require("./routes/login");
const db = require("./config/db");
const homeRoute = require("./routes/home");
const dashboardRoute = require("./routes/dashboard");
const transaksiRoute = require("./routes/transaksi");
const rekeningRoute = require("./routes/rekening");
const kategoriRoute = require("./routes/kategori");

const app = express();

app.use(
    session({
        secret: "dkm-secret",
        resave: false,
        saveUninitialized: false
    })
);
console.log("APP TERBARU TERBACA");

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use("/login", loginRoute);
app.use("/dashboard", dashboardRoute);
app.use("/laporan", laporanRoute);
app.use("/", homeRoute);
app.use("/transaksi", transaksiRoute);
app.use("/rekening", rekeningRoute);
app.use("/kategori", kategoriRoute);

app.get("/test", (req, res) => {
    res.send("TEST BERHASIL");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server berjalan di port " + PORT);
});