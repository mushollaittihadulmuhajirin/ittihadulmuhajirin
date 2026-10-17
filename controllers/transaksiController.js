const transaksiModel = require("../models/transaksiModel");
const saldoService = require("../services/saldoService");
const db = require("../config/db");

exports.index = async (req, res) => {

    try {

        const [
            kategori,
            rekening,
            transaksi,
            donasi,
            inventaris,
            ringkasanSaldo
        ] = await Promise.all([

            transaksiModel.getKategori(),

            transaksiModel.getRekening(),

            transaksiModel.getTransaksi(),

            transaksiModel.getDonasi(),

            transaksiModel.getInventaris(),

            saldoService.getRingkasanSaldo(db)

        ]);

        const pemasukan = ringkasanSaldo.totalMasuk;
        const pengeluaran = ringkasanSaldo.totalKeluar;
        const saldo = ringkasanSaldo.saldoTotal;
        const saldoTotal = ringkasanSaldo.saldoTotal;
        const saldoTunai = ringkasanSaldo.saldoTunai;
        const saldoNonTunai = ringkasanSaldo.saldoNonTunai;

        res.render("transaksi", {

            kategori,

            rekening,

            transaksi,

            donasi,

            inventaris,

            pemasukan,

            pengeluaran,

            saldo,

            saldoTotal,

            saldoTunai,

            saldoNonTunai,

            tanggalCutoff: ringkasanSaldo.tanggalCutoff

        });

    }

    catch (err) {

        console.log(err);

        res.send("Gagal memuat transaksi");

    }

};
exports.simpan = async (req,res)=>{

    console.log("================================");
    console.log("BODY:");
    console.log(req.body);

    try{

        const tipe=req.body.tipe_transaksi;

        console.log("TIPE =",tipe);

        if(tipe==="uang"){

            console.log("MASUK SIMPAN UANG");

            await transaksiModel.simpanUang(req.body);

            return res.redirect("/transaksi");

        }

        if(tipe==="donasi"){

            console.log("MASUK SIMPAN DONASI");

            await transaksiModel.simpanDonasi(req.body);

            return res.redirect("/transaksi");

        }

        if(tipe==="inventaris"){

            console.log("MASUK SIMPAN INVENTARIS");

            await transaksiModel.simpanInventaris(req.body);

            return res.redirect("/transaksi");

        }

        console.log("TIPE TIDAK DIKENAL");

        return res.redirect("/transaksi");

    }catch(err){

        console.log("ERROR CONTROLLER");

        console.log(err);

        return res.send(err.sqlMessage||err.message);

    }

}