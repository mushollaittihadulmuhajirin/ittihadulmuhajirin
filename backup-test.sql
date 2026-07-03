/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: admin
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `admin` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: aset
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `aset` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama_aset` varchar(255) NOT NULL,
  `kategori` varchar(100) DEFAULT NULL,
  `jumlah` int DEFAULT '1',
  `kondisi` varchar(100) DEFAULT NULL,
  `sumber` varchar(255) DEFAULT NULL,
  `tanggal_masuk` date DEFAULT NULL,
  `nilai_estimasi` bigint DEFAULT '0',
  `keterangan` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `satuan` varchar(30) DEFAULT NULL,
  `donatur` varchar(150) DEFAULT NULL,
  `lokasi` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 10 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: donasi_barang
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `donasi_barang` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tanggal` date NOT NULL,
  `nama_donatur` varchar(100) NOT NULL,
  `nama_barang` varchar(150) NOT NULL,
  `kategori` varchar(100) DEFAULT NULL,
  `jumlah` int DEFAULT '1',
  `satuan` varchar(50) DEFAULT NULL,
  `kondisi` varchar(50) DEFAULT NULL,
  `estimasi_harga` decimal(15, 2) DEFAULT '0.00',
  `keterangan` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 15 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: donatur
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `donatur` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `alamat` text COLLATE utf8mb4_general_ci,
  `hp` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: kategori
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `kategori` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tipe` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 18 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: rekening
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `rekening` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama_pemilik` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `bank` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `no_rekening` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `keterangan` text COLLATE utf8mb4_general_ci,
  `status` enum('aktif', 'nonaktif') COLLATE utf8mb4_general_ci DEFAULT 'aktif',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 6 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: transaksi
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `transaksi` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tanggal` date DEFAULT NULL,
  `kategori_id` int DEFAULT NULL,
  `jenis` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `nominal` decimal(15, 2) DEFAULT NULL,
  `keterangan` text COLLATE utf8mb4_general_ci,
  `bukti` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `metode` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `rekening_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 22 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: users
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `role` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: admin
# ------------------------------------------------------------

INSERT INTO
  `admin` (`id`, `username`, `password`)
VALUES
  (
    1,
    'admin',
    '$2b$10$mXD4x5ZGpzjQfsxko0qn6.kqO3hHrYr5.oFkblKDE5.VdycC4li2a'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: aset
# ------------------------------------------------------------

INSERT INTO
  `aset` (
    `id`,
    `nama_aset`,
    `kategori`,
    `jumlah`,
    `kondisi`,
    `sumber`,
    `tanggal_masuk`,
    `nilai_estimasi`,
    `keterangan`,
    `created_at`,
    `satuan`,
    `donatur`,
    `lokasi`
  )
VALUES
  (
    7,
    'karpet',
    'Furniture',
    5,
    'Baru',
    NULL,
    '2026-07-01',
    0,
    'Donasi Warga',
    '2026-07-01 18:16:23',
    'Meter',
    NULL,
    'Gudang'
  );
INSERT INTO
  `aset` (
    `id`,
    `nama_aset`,
    `kategori`,
    `jumlah`,
    `kondisi`,
    `sumber`,
    `tanggal_masuk`,
    `nilai_estimasi`,
    `keterangan`,
    `created_at`,
    `satuan`,
    `donatur`,
    `lokasi`
  )
VALUES
  (
    9,
    'Vacuum',
    'Elektronik',
    1,
    'Bekas',
    NULL,
    '2026-07-01',
    0,
    'Donasi Warga',
    '2026-07-01 18:33:47',
    'unit',
    NULL,
    'Gudang'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: donasi_barang
# ------------------------------------------------------------

INSERT INTO
  `donasi_barang` (
    `id`,
    `tanggal`,
    `nama_donatur`,
    `nama_barang`,
    `kategori`,
    `jumlah`,
    `satuan`,
    `kondisi`,
    `estimasi_harga`,
    `keterangan`,
    `created_at`
  )
VALUES
  (
    13,
    '2026-06-29',
    'A1',
    'semen',
    'Pembangunan',
    10,
    'sak',
    'Baru',
    0.00,
    'donasi warga',
    '2026-07-01 18:13:21'
  );
INSERT INTO
  `donasi_barang` (
    `id`,
    `tanggal`,
    `nama_donatur`,
    `nama_barang`,
    `kategori`,
    `jumlah`,
    `satuan`,
    `kondisi`,
    `estimasi_harga`,
    `keterangan`,
    `created_at`
  )
VALUES
  (
    14,
    '2026-07-01',
    'Hamba Allah',
    'Pasir',
    'Pembangunan',
    2,
    'Truck',
    'Bekas',
    0.00,
    'Donasi Warga',
    '2026-07-01 18:14:42'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: donatur
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: kategori
# ------------------------------------------------------------

INSERT INTO
  `kategori` (`id`, `nama`, `tipe`)
VALUES
  (1, 'Infaq Jumat', 'uang');
INSERT INTO
  `kategori` (`id`, `nama`, `tipe`)
VALUES
  (2, 'Infaq Harian', 'uang');
INSERT INTO
  `kategori` (`id`, `nama`, `tipe`)
VALUES
  (3, 'Donasi Pembangunan', 'uang');
INSERT INTO
  `kategori` (`id`, `nama`, `tipe`)
VALUES
  (4, 'Zakat', 'uang');
INSERT INTO
  `kategori` (`id`, `nama`, `tipe`)
VALUES
  (5, 'Listrik', 'uang');
INSERT INTO
  `kategori` (`id`, `nama`, `tipe`)
VALUES
  (6, 'Air', 'uang');
INSERT INTO
  `kategori` (`id`, `nama`, `tipe`)
VALUES
  (7, 'Kebersihan', 'uang');
INSERT INTO
  `kategori` (`id`, `nama`, `tipe`)
VALUES
  (8, 'Operasional', 'uang');
INSERT INTO
  `kategori` (`id`, `nama`, `tipe`)
VALUES
  (9, 'Karpet', 'donasi');
INSERT INTO
  `kategori` (`id`, `nama`, `tipe`)
VALUES
  (10, 'Al Quran', 'donasi');
INSERT INTO
  `kategori` (`id`, `nama`, `tipe`)
VALUES
  (11, 'Sound System', 'inventaris');
INSERT INTO
  `kategori` (`id`, `nama`, `tipe`)
VALUES
  (12, 'Elektronik', 'inventaris');
INSERT INTO
  `kategori` (`id`, `nama`, `tipe`)
VALUES
  (13, 'Furniture', 'inventaris');
INSERT INTO
  `kategori` (`id`, `nama`, `tipe`)
VALUES
  (14, 'PHBI Muharam santunan', 'uang');
INSERT INTO
  `kategori` (`id`, `nama`, `tipe`)
VALUES
  (15, 'Donasi Cat', 'donasi');
INSERT INTO
  `kategori` (`id`, `nama`, `tipe`)
VALUES
  (16, 'Kebersihan', 'inventaris');
INSERT INTO
  `kategori` (`id`, `nama`, `tipe`)
VALUES
  (17, 'Pembangunan', 'donasi');

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: rekening
# ------------------------------------------------------------

INSERT INTO
  `rekening` (
    `id`,
    `nama_pemilik`,
    `bank`,
    `no_rekening`,
    `keterangan`,
    `status`,
    `created_at`
  )
VALUES
  (
    4,
    'Muhammad riyadi',
    'bca',
    '1111111111111111111',
    NULL,
    'aktif',
    '2026-07-01 17:54:33'
  );
INSERT INTO
  `rekening` (
    `id`,
    `nama_pemilik`,
    `bank`,
    `no_rekening`,
    `keterangan`,
    `status`,
    `created_at`
  )
VALUES
  (
    5,
    'Muhammad riyadi',
    'Mandiri',
    '2222222222222222',
    NULL,
    'aktif',
    '2026-07-01 17:55:52'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: transaksi
# ------------------------------------------------------------

INSERT INTO
  `transaksi` (
    `id`,
    `tanggal`,
    `kategori_id`,
    `jenis`,
    `nominal`,
    `keterangan`,
    `bukti`,
    `created_at`,
    `metode`,
    `rekening_id`
  )
VALUES
  (
    17,
    '2026-06-29',
    1,
    'masuk',
    300000.00,
    'Blok A8',
    NULL,
    '2026-07-01 18:02:32',
    NULL,
    NULL
  );
INSERT INTO
  `transaksi` (
    `id`,
    `tanggal`,
    `kategori_id`,
    `jenis`,
    `nominal`,
    `keterangan`,
    `bukti`,
    `created_at`,
    `metode`,
    `rekening_id`
  )
VALUES
  (
    18,
    '2026-07-01',
    6,
    'keluar',
    30000.00,
    'Minum ',
    NULL,
    '2026-07-01 18:03:00',
    'tunai',
    NULL
  );
INSERT INTO
  `transaksi` (
    `id`,
    `tanggal`,
    `kategori_id`,
    `jenis`,
    `nominal`,
    `keterangan`,
    `bukti`,
    `created_at`,
    `metode`,
    `rekening_id`
  )
VALUES
  (
    19,
    '2026-07-01',
    8,
    'keluar',
    20000.00,
    'beli paku',
    NULL,
    '2026-07-01 18:03:54',
    'transfer',
    5
  );
INSERT INTO
  `transaksi` (
    `id`,
    `tanggal`,
    `kategori_id`,
    `jenis`,
    `nominal`,
    `keterangan`,
    `bukti`,
    `created_at`,
    `metode`,
    `rekening_id`
  )
VALUES
  (
    21,
    '2026-07-01',
    2,
    'masuk',
    70000.00,
    'donasi',
    NULL,
    '2026-07-01 18:12:53',
    'transfer',
    5
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: users
# ------------------------------------------------------------


/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
