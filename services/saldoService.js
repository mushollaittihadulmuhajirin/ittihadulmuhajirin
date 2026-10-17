/**
 * ====================================================================
 * Saldo Service - Manajemen Saldo Cut-Off & Real-Time DKM V1
 * ====================================================================
 * 
 * Nilai acuan saldo cut-off resmi DKM V1 (per 16 Oktober 2026):
 * - Saldo Total: Rp 8.386.296 (Pemasukan Rp 40.509.610 - Pengeluaran Rp 32.123.314)
 * - Saldo Non-Tunai — Mandiri: Rp 3.204.296,51 (tepat tanpa pembulatan)
 * - Saldo Tunai — Kas & Dompet: Rp 5.182.000 (pembulatan ke kelipatan Rp 100 dari Rp 5.181.999,49)
 * 
 * Tanggal cut-off: 2026-10-16
 * - Seluruh 54 transaksi historis yang ada di database berada pada atau sebelum tanggal cut-off.
 * - Saldo awal cut-off ini menjadi titik acuan awal operasional (baseline).
 * - Transaksi baru setelah cut-off (tanggal > 2026-10-16) akan mempengaruhi saldo acuan:
 *     * Pemasukan tunai (+) Saldo Tunai & Saldo Total
 *     * Pengeluaran tunai (-) Saldo Tunai & Saldo Total
 *     * Pemasukan transfer (+) Saldo Non-Tunai & Saldo Total
 *     * Pengeluaran transfer (-) Saldo Non-Tunai & Saldo Total
 *     * Perpindahan internal tidak menambah/mengurangi total saldo
 */

const CUTOFF_CONFIG = {
    tanggalCutoff: '2026-10-16',
    saldoTotal: 8386296,
    saldoTunai: 5182000,
    saldoNonTunai: 3204296.51,
    baselineMasuk: 40509610,
    baselineKeluar: 32123314
};

/**
 * Mengambil ringkasan saldo terkini secara asinkron dari database
 * @param {object} db - Koneksi database mysql2 pool
 * @returns {Promise<{ saldoTotal: number, saldoTunai: number, saldoNonTunai: number, totalMasuk: number, totalKeluar: number, tanggalCutoff: string }>}
 */
function getRingkasanSaldo(db) {
    return new Promise((resolve, reject) => {
        // 1. Ambil transaksi yang terjadi SETELAH tanggal cut-off
        const sqlPostCutoff = `
            SELECT *
            FROM transaksi
            WHERE tanggal > ?
            ORDER BY tanggal ASC, id ASC
        `;

        db.query(sqlPostCutoff, [CUTOFF_CONFIG.tanggalCutoff], (errPost, postCutoffRows) => {
            if (errPost) {
                console.error("Gagal mengambil transaksi pasca cut-off:", errPost);
                // Fallback aman ke baseline jika query gagal
                return resolve({
                    saldoTotal: CUTOFF_CONFIG.saldoTotal,
                    saldoTunai: CUTOFF_CONFIG.saldoTunai,
                    saldoNonTunai: CUTOFF_CONFIG.saldoNonTunai,
                    totalMasuk: CUTOFF_CONFIG.baselineMasuk,
                    totalKeluar: CUTOFF_CONFIG.baselineKeluar,
                    tanggalCutoff: CUTOFF_CONFIG.tanggalCutoff
                });
            }

            // Hitung dampak transaksi baru setelah cut-off terhadap saldo acuan
            let deltaTotal = 0;
            let deltaTunai = 0;
            let deltaNonTunai = 0;
            let deltaMasuk = 0;
            let deltaKeluar = 0;

            if (Array.isArray(postCutoffRows) && postCutoffRows.length > 0) {
                postCutoffRows.forEach(item => {
                    const nominal = Number(item.nominal) || 0;
                    const jenis = String(item.jenis || '').toLowerCase().trim();
                    const metode = String(item.metode || '').toLowerCase().trim();

                    if (jenis === 'masuk') {
                        deltaMasuk += nominal;
                        deltaTotal += nominal;
                        if (metode === 'tunai') deltaTunai += nominal;
                        else if (metode === 'transfer') deltaNonTunai += nominal;
                    } else if (jenis === 'keluar') {
                        deltaKeluar += nominal;
                        deltaTotal -= nominal;
                        if (metode === 'tunai') deltaTunai -= nominal;
                        else if (metode === 'transfer') deltaNonTunai -= nominal;
                    }
                });
            }

            // 2. Ambil total pemasukan dan pengeluaran akumulatif dari database
            const sqlTotal = `
                SELECT
                    COALESCE(SUM(CASE WHEN jenis='masuk' THEN nominal ELSE 0 END), 0) AS total_masuk,
                    COALESCE(SUM(CASE WHEN jenis='keluar' THEN nominal ELSE 0 END), 0) AS total_keluar
                FROM transaksi
            `;

            db.query(sqlTotal, (errTotal, totalRows) => {
                let totalMasuk = CUTOFF_CONFIG.baselineMasuk + deltaMasuk;
                let totalKeluar = CUTOFF_CONFIG.baselineKeluar + deltaKeluar;

                if (!errTotal && totalRows && totalRows.length > 0) {
                    const dbMasuk = Number(totalRows[0].total_masuk);
                    const dbKeluar = Number(totalRows[0].total_keluar);
                    if (!isNaN(dbMasuk) && dbMasuk > 0) totalMasuk = dbMasuk;
                    if (!isNaN(dbKeluar) && dbKeluar > 0) totalKeluar = dbKeluar;
                }

                const saldoTotal = CUTOFF_CONFIG.saldoTotal + deltaTotal;
                const saldoTunai = CUTOFF_CONFIG.saldoTunai + deltaTunai;
                const saldoNonTunai = CUTOFF_CONFIG.saldoNonTunai + deltaNonTunai;

                resolve({
                    saldoTotal,
                    saldoTunai,
                    saldoNonTunai,
                    totalMasuk,
                    totalKeluar,
                    tanggalCutoff: CUTOFF_CONFIG.tanggalCutoff
                });
            });
        });
    });
}

module.exports = {
    CUTOFF_CONFIG,
    getRingkasanSaldo
};

