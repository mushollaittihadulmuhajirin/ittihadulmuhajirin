const express = require("express");
const router = express.Router();

const db = require("../config/db");


router.get("/", (req,res)=>{


    db.query(
        `
        SELECT 
        transaksi.*,
        kategori.nama AS kategori_nama,
        rekening.bank,
        rekening.no_rekening

        FROM transaksi

        LEFT JOIN kategori 
        ON transaksi.kategori_id = kategori.id

        LEFT JOIN rekening
        ON transaksi.rekening_id = rekening.id

        ORDER BY transaksi.id DESC
        `,
        (err, rows)=>{


            if(err){
                console.log(err);
                return res.send("Error Laporan");
            }


            let masuk = 0;
            let keluar = 0;


            rows.forEach(item=>{

                if(item.jenis=="masuk"){
                    masuk += Number(item.nominal);
                }

                if(item.jenis=="keluar"){
                    keluar += Number(item.nominal);
                }

            });


            res.render("laporan",{
                data:rows,
                masuk,
                keluar,
                saldo: masuk-keluar
            });


        }
    );


});


module.exports = router;