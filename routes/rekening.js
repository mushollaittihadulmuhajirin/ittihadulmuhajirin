const express = require("express");
const router = express.Router();

const db = require("../config/db");


// tampil rekening
router.get("/", (req,res)=>{

    db.query(
        "SELECT * FROM rekening ORDER BY id DESC",
        (err, rows)=>{

            if(err){
                console.log(err);
                return res.send("Database Error");
            }

            res.render("rekening", {
                data: rows
            });

        }
    );

});


// simpan rekening
router.post("/simpan",(req,res)=>{

    const {
        nama_pemilik,
        bank,
        no_rekening,
        keterangan
    } = req.body;


    db.query(
        `
        INSERT INTO rekening
        (nama_pemilik,bank,no_rekening,keterangan)
        VALUES (?,?,?,?)
        `,
        [
            nama_pemilik,
            bank,
            no_rekening,
            keterangan
        ],
        (err)=>{

            if(err){
                console.log(err);
                return res.send("Gagal simpan");
            }

            res.redirect("/rekening");

        }
    );

});


// hapus
router.get("/hapus/:id",(req,res)=>{

    db.query(
        "DELETE FROM rekening WHERE id=?",
        [req.params.id],
        ()=>{
            res.redirect("/rekening");
        }
    );

});


module.exports = router;