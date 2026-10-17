const express = require("express");
const router = express.Router();
const { renderLaporanPage } = require("./laporan");

// GET / langsung menampilkan laporan keuangan (menggunakan controller dan view yang sama dengan /laporan)
router.get("/", renderLaporanPage);

module.exports = router;