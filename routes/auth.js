const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");

router.get("/ubah-password", authController.formUbahPassword);

router.post("/ubah-password", authController.simpanPassword);

module.exports = router;