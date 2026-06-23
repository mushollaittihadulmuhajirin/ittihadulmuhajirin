const express = require("express");
const router = express.Router();

const db = require("../config/db");


// tampil kategori
router.get("/", (req,res)=>{

    db.query(
        "SELECT * FROM kategori ORDER BY id DESC",
        (err,rows)=>{

            if(err){
                console.log(err);
                return res.send("Error Database");
            }

            res.render("kategori",{
                data:rows
            });

        }
    );

});


// simpan kategori
router.post("/simpan",(req,res)=>{

    const {nama} = req.body;


    db.query(
        "INSERT INTO kategori (nama) VALUES (?)",
        [nama],
        (err)=>{

            if(err){
                console.log(err);
                return res.send("Gagal Simpan");
            }

            res.redirect("/kategori");

        }
    );

});


// hapus
router.get("/hapus/:id",(req,res)=>{

    db.query(
        "DELETE FROM kategori WHERE id=?",
        [req.params.id],
        ()=>{
            res.redirect("/kategori");
        }
    );

});


module.exports = router;