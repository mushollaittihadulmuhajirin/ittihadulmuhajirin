const db = require("../config/db");

exports.getKategori = () => {
    return new Promise((resolve, reject) => {

        db.query(
            "SELECT * FROM kategori ORDER BY nama ASC",
            (err, rows) => {

                if (err) return reject(err);

                resolve(rows);

            }
        );

    });
};

exports.getRekening = () => {
    return new Promise((resolve, reject) => {

        db.query(
            "SELECT * FROM rekening ORDER BY bank ASC",
            (err, rows) => {

                if (err) return reject(err);

                resolve(rows);

            }
        );

    });
};

exports.getTransaksi = () => {
    return new Promise((resolve, reject) => {

        db.query(
            `SELECT
                t.*,
                k.nama AS kategori,
                r.nama_pemilik AS nama_rekening
            FROM transaksi t
            LEFT JOIN kategori k
                ON t.kategori_id = k.id
            LEFT JOIN rekening r
                ON t.rekening_id = r.id
            ORDER BY t.tanggal DESC,t.id DESC`,
            (err, rows) => {

                if (err) return reject(err);

                resolve(rows);

            }
        );

    });
};

exports.getDonasi = () => {
    return new Promise((resolve, reject) => {

        db.query(
            "SELECT * FROM donasi_barang ORDER BY tanggal DESC,id DESC",
            (err, rows) => {

                if (err) return reject(err);

                resolve(rows);

            }
        );

    });
};

exports.getInventaris = () => {
    return new Promise((resolve, reject) => {

        db.query(
            "SELECT * FROM aset ORDER BY tanggal_masuk DESC,id DESC",
            (err, rows) => {

                if (err) return reject(err);

                resolve(rows);

            }
        );

    });
};
exports.simpanUang = (data) => {

    return new Promise((resolve, reject) => {

        const sql = `
            INSERT INTO transaksi
            (
                tanggal,
                jenis,
                kategori_id,
                metode,
                rekening_id,
                nominal,
                keterangan
            )
            VALUES (?,?,?,?,?,?,?)
        `;

        db.query(
            sql,
            [
                data.tanggal,
                data.jenis,
                data.kategori_id,
                data.metode,
                data.metode === "tunai"
                    ? null
                    : data.rekening_id,
                data.nominal,
                data.keterangan
            ],
            (err, result) => {

                if (err)
                    return reject(err);

                resolve(result);

            }
        );

    });

};
exports.simpanDonasi = (data) => {

    return new Promise((resolve, reject) => {

        const sql = `
            INSERT INTO donasi_barang
            (
                tanggal,
                nama_donatur,
                nama_barang,
                kategori,
                jumlah,
                satuan,
                kondisi,
                estimasi_harga,
                keterangan
            )
            VALUES
            (?,?,?,?,?,?,?,?,?)
        `;

        db.query(
            sql,
            [
                data.tanggal,
                data.nama_donatur,
                data.nama_barang,
                data.kategori,
                data.jumlah,
                data.satuan,
                data.kondisi,
                data.estimasi_harga || 0,
                data.keterangan
            ],
            (err, result) => {

                if (err)
                    return reject(err);

                resolve(result);

            }
        );

    });

};
exports.simpanInventaris = (data) => {

    return new Promise((resolve, reject) => {

        const sql = `
            INSERT INTO aset
            (
                nama_aset,
                kategori,
                jumlah,
                satuan,
                kondisi,
                lokasi,
                nilai_estimasi,
                tanggal_masuk,
                keterangan
            )
            VALUES
            (?,?,?,?,?,?,?,?,?)
        `;

        db.query(
            sql,
            [
                data.nama_barang,
                data.kategori,
                data.jumlah,
                data.satuan,
                data.kondisi,
                data.lokasi,
                data.nilai_estimasi || 0,
                data.tanggal_masuk,
                data.keterangan
            ],
            (err, result) => {

                if (err)
                    return reject(err);

                resolve(result);

            }
        );

    });

};
