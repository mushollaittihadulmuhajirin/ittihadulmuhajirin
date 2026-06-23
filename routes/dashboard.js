const express = require("express");
const router = express.Router();

const db = require("../config/db");


router.get("/", (req,res)=>{

    if(!req.session.user){
        return res.redirect("/login");
    }

    // kode dashboard


    db.query(
        `
        SELECT 
        SUM(CASE WHEN jenis='masuk' THEN nominal ELSE 0 END) AS pemasukan,
        SUM(CASE WHEN jenis='keluar' THEN nominal ELSE 0 END) AS pengeluaran
        FROM transaksi
        `,
        (err, hasil)=>{


            if(err){
                console.log(err);
                return res.send("Error Dashboard");
            }


            const pemasukan = hasil[0].pemasukan || 0;
            const pengeluaran = hasil[0].pengeluaran || 0;
            const saldo = pemasukan - pengeluaran;


            res.render("dashboard",{
                pemasukan,
                pengeluaran,
                saldo
            });


        }
    );


});


module.exports = router;