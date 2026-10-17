const express = require("express");
const router = express.Router();
const db = require("../config/db");

// ======================================
// MIDDLEWARE LOGIN
// ======================================
function checkLogin(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    return res.redirect("/login");
}

// ======================================
// 1. GET /kategori (LIST DENGAN FILTER & SEARCH)
// ======================================
router.get("/", checkLogin, (req, res) => {
    const rawTipe = (req.query.tipe || "").trim().toLowerCase();
    const filterTipe = ["uang", "donasi", "inventaris"].includes(rawTipe) ? rawTipe : "all";
    const filterQ = (req.query.q || "").trim();

    // 1. Ambil statistik jumlah per tipe
    const countSql = `
        SELECT
            COUNT(*) AS total_semua,
            SUM(CASE WHEN tipe = 'uang' THEN 1 ELSE 0 END) AS total_uang,
            SUM(CASE WHEN tipe = 'donasi' THEN 1 ELSE 0 END) AS total_donasi,
            SUM(CASE WHEN tipe = 'inventaris' THEN 1 ELSE 0 END) AS total_inventaris
        FROM kategori
    `;

    db.query(countSql, (errCount, countRows) => {
        const counts = (countRows && countRows[0]) ? {
            semua: countRows[0].total_semua || 0,
            uang: countRows[0].total_uang || 0,
            donasi: countRows[0].total_donasi || 0,
            inventaris: countRows[0].total_inventaris || 0
        } : { semua: 0, uang: 0, donasi: 0, inventaris: 0 };

        // 2. Bangun query filter
        let whereClauses = ["1=1"];
        const params = [];

        if (filterTipe !== "all") {
            whereClauses.push("tipe = ?");
            params.push(filterTipe);
        }

        if (filterQ) {
            whereClauses.push("nama LIKE ?");
            params.push(`%${filterQ}%`);
        }

        const dataSql = `
            SELECT * FROM kategori
            WHERE ${whereClauses.join(" AND ")}
            ORDER BY id DESC
        `;

        db.query(dataSql, params, (errData, rows) => {
            if (errData) {
                console.error("Error mengambil kategori:", errData);
                rows = [];
            }

            res.render("kategori", {
                data: rows || [],
                user: req.session.user,
                filterTipe,
                filterQ,
                counts,
                status: req.query.status || null,
                error: req.query.error || null
            });
        });
    });
});

// ======================================
// 2. POST /kategori/simpan (TAMBAH KATEGORI)
// ======================================
router.post("/simpan", checkLogin, (req, res) => {
    const rawNama = req.body.nama || "";
    const rawTipe = req.body.tipe || "";

    const nama = String(rawNama).trim();
    const tipe = String(rawTipe).trim().toLowerCase();

    if (!nama || nama.length < 2) {
        return res.redirect("/kategori?error=" + encodeURIComponent("Nama kategori wajib diisi minimal 2 karakter."));
    }

    if (!["uang", "donasi", "inventaris"].includes(tipe)) {
        return res.redirect("/kategori?error=" + encodeURIComponent("Pilih jenis klasifikasi yang valid (Uang, Donasi, atau Inventaris)."));
    }

    // Cek duplikasi nama pada tipe yang sama
    db.query("SELECT id FROM kategori WHERE LOWER(nama) = LOWER(?) AND tipe = ? LIMIT 1", [nama, tipe], (errCheck, rowsCheck) => {
        if (!errCheck && rowsCheck && rowsCheck.length > 0) {
            return res.redirect("/kategori?error=" + encodeURIComponent(`Kategori "${nama}" dengan jenis tersebut sudah ada.`));
        }

        db.query(
            "INSERT INTO kategori (nama, tipe) VALUES (?, ?)",
            [nama, tipe],
            (errInsert) => {
                if (errInsert) {
                    console.error("Error insert kategori:", errInsert);
                    return res.redirect("/kategori?error=" + encodeURIComponent("Gagal menyimpan kategori ke database: " + errInsert.message));
                }

                res.redirect("/kategori?status=sukses_tambah");
            }
        );
    });
});

// ======================================
// 3. POST /kategori/edit/:id (EDIT KATEGORI)
// ======================================
router.post("/edit/:id", checkLogin, (req, res) => {
    const { id } = req.params;
    const rawNama = req.body.nama || "";
    const rawTipe = req.body.tipe || "";

    const nama = String(rawNama).trim();
    const tipe = String(rawTipe).trim().toLowerCase();

    if (!nama || nama.length < 2) {
        return res.redirect("/kategori?error=" + encodeURIComponent("Nama kategori wajib diisi minimal 2 karakter."));
    }

    if (!["uang", "donasi", "inventaris"].includes(tipe)) {
        return res.redirect("/kategori?error=" + encodeURIComponent("Pilih jenis klasifikasi yang valid."));
    }

    db.query(
        "UPDATE kategori SET nama = ?, tipe = ? WHERE id = ?",
        [nama, tipe, id],
        (errUpdate) => {
            if (errUpdate) {
                console.error("Error update kategori:", errUpdate);
                return res.redirect("/kategori?error=" + encodeURIComponent("Gagal memperbarui kategori: " + errUpdate.message));
            }

            res.redirect("/kategori?status=sukses_edit");
        }
    );
});

// ======================================
// 4. GET /kategori/hapus/:id (HAPUS KATEGORI)
// ======================================
router.get("/hapus/:id", checkLogin, (req, res) => {
    const { id } = req.params;

    db.query("DELETE FROM kategori WHERE id = ?", [id], (errDelete) => {
        if (errDelete) {
            console.error("Error delete kategori:", errDelete);
            return res.redirect("/kategori?error=" + encodeURIComponent("Gagal menghapus kategori: " + errDelete.message));
        }

        res.redirect("/kategori?status=sukses_hapus");
    });
});

module.exports = router;