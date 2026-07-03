const express = require("express");
const router = express.Router();

function checkLogin(req, res, next) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    next();
}

router.get("/", checkLogin, (req, res) => {

    res.render("restore", {
        title: "Restore Database"
    });

});

module.exports = router;