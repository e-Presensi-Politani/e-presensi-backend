# 📦 E-Presensi Backend

<div align="center">
  
![Version](https://img.shields.io/badge/version-0.0.4-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![NestJS](https://img.shields.io/badge/NestJS-11.1.0-red)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-green)

</div>

Sistem E-Presensi adalah aplikasi manajemen kehadiran digital yang dikembangkan untuk Politani, menyediakan solusi komprehensif untuk pengelolaan kehadiran, izin, dan manajemen departemen secara terpadu dan efisien.

## 🚀 Tentang Proyek

E-Presensi Backend adalah sistem kehadiran elektronik yang dibangun menggunakan NestJS dan MongoDB untuk menyediakan API yang handal dan aman bagi aplikasi kehadiran digital.

## ✨ Fitur Utama

### 🔐 Autentikasi dan Pengguna
- Sistem login dan registrasi yang aman dengan JWT
- Manajemen peran dan hak akses (admin, kepala departemen, anggota)
- Manajemen pengguna dan profil
- Fitur pemulihan dan perubahan kata sandi

### 📝 Kehadiran
- Check-in dan check-out dengan verifikasi foto
- Validasi lokasi geografis untuk memastikan kehadiran di lokasi yang tepat
- Histori kehadiran lengkap dan terverifikasi
- Koreksi data kehadiran dengan approval system

### 🏢 Manajemen Departemen
- Pembuatan dan pengelolaan departemen
- Penugasan kepala departemen dan anggota
- Struktur organisasi yang jelas dan terorganisir

### 📅 Permintaan Cuti
- Pengajuan permintaan cuti dengan dokumen pendukung
- Sistem approval multi-level
- Notifikasi status permintaan
- Pelacakan cuti dan alokasi

### 📊 Statistik dan Laporan
- Analisis kehadiran real-time
- Laporan bulanan dan tahunan
- Export data ke format Excel
- Visualisasi data kehadiran

### 📁 Manajemen File
- Upload dan penyimpanan dokumen
- Kategori file untuk berbagai keperluan
- Akses file dan kontrol keamanan

## 💻 Teknologi

<div align="center">
  
| Teknologi | Versi | Kegunaan |
|-----------|-------|----------|
| NestJS | ^11.1.0 | Framework backend |
| MongoDB | ^8.14.1 | Database NoSQL |
| Mongoose | ^8.14.1 | ODM untuk MongoDB |
| JWT | ^11.0.0 | Autentikasi |
| Passport | ^0.7.0 | Middleware autentikasi |
| ExcelJS | ^4.4.0 | Pembuatan laporan Excel |
| Bcrypt | ^5.1.1 | Enkripsi password |
| Class-validator | ^0.14.2 | Validasi input |

</div>

## 📂 Struktur Proyek

```
.
├── src/
│   ├── app.controller.ts         # Controller utama aplikasi
│   ├── app.module.ts             # Modul utama aplikasi
│   ├── app.service.ts            # Service utama aplikasi
│   ├── main.ts                   # Entry point aplikasi
│   ├── auth/                     # Modul autentikasi
│   ├── users/                    # Modul pengguna
│   ├── departments/              # Modul departemen
│   ├── attendance/               # Modul kehadiran
│   ├── leave-requests/           # Modul permintaan cuti
│   ├── corrections/              # Modul koreksi kehadiran
│   ├── statistics/               # Modul statistik
│   ├── files/                    # Modul manajemen file
│   ├── config/                   # Konfigurasi aplikasi
│   └── common/                   # Utilitas dan fungsi umum
├── uploads/                      # Direktori penyimpanan file
├── test/                         # Direktori pengujian
└── ...
```

## 🔧 Instalasi

```bash
# Clone repositori
git clone https://github.com/e-Presensi-Politani/e-presensi-backend.git

# Masuk ke direktori proyek
cd e-presensi-backend

# Instal dependensi
npm install

```
## 🌍 Konfigurasi Environment
Konfigurasi environment (buat file .env)
```env
# Server Configuration
NODE_ENV=development
PORT=3000
API_PREFIX=api

# MongoDB Configuration
MONGODB_URI=<mongodb_uri>

# JWT Authentication
JWT_SECRET=<your_jwt_secret_key>
JWT_EXPIRATION=1d
JWT_REFRESH_SECRET=<your_jwt_refresh_secret_key>
JWT_REFRESH_EXPIRATION=7d

# File Upload Configuration
PROFILE_IMAGE_DIR=uploads/profile
ATTENDANCE_PHOTO_DIR=uploads/attendance
LEAVE_ATTACHMENT_DIR=uploads/leave
MAX_FILE_SIZE=5242880  # 5MB in bytes

# Attendance Configuration
LATE_TOLERANCE_MINUTES=15
EARLY_LEAVE_TOLERANCE_MINUTES=15
MIN_WORK_HOURS=8.5

# Office Location for Geofencing
OFFICE_LATITUDE=<office_latitude>
OFFICE_LONGITUDE=<office_longitude>
GEOFENCE_RADIUS=450  # in meters

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=<your_email@example.com>
EMAIL_PASSWORD=<your_email_password>
EMAIL_FROM="e-Presensi Politani <no-reply@politani.ac.id>"

# Application URLs
FRONTEND_URL=http://localhost:3001
BACKEND_URL=http://localhost:3000

# Storage Configuration
STORAGE_TYPE=local
```
–– atau ––
```bash
cp .env.example .env
```
Edit file .env sesuai kebutuhan

---
## 🚀 Penggunaan

```bash
# Mode pengembangan
npm run start:dev

# Mode produksi
npm run build
npm run start:prod

# Mode debug
npm run start:debug

# Format kode
npm run format

# Linting
npm run lint
```

## 🔌 API Endpoint

### 🔐 Autentikasi & Pengguna

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/auth/login` | Login pengguna |
| POST | `/api/auth/register` | Registrasi pengguna baru |
| POST | `/api/auth/refresh` | Memperbarui token |
| GET | `/api/auth/profile` | Mendapatkan profil pengguna |
| PATCH | `/api/auth/change-password` | Mengubah kata sandi |
| POST | `/api/users` | Membuat pengguna baru |
| GET | `/api/users` | Mendapatkan daftar pengguna |
| GET | `/api/users/:guid` | Mendapatkan detail pengguna |
| PATCH | `/api/users/:guid` | Memperbarui data pengguna |
| DELETE | `/api/users/:guid` | Menghapus pengguna |
| POST | `/api/users/first-admin` | Membuat admin pertama |

### 📝 Kehadiran

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/attendance/check-in` | Melakukan check-in |
| POST | `/api/attendance/check-out` | Melakukan check-out |
| GET | `/api/attendance/today` | Mendapatkan kehadiran hari ini |
| GET | `/api/attendance` | Mendapatkan semua data kehadiran |
| GET | `/api/attendance/my-records` | Mendapatkan riwayat kehadiran pribadi |
| GET | `/api/attendance/summary` | Mendapatkan ringkasan kehadiran |
| GET | `/api/attendance/my-summary` | Mendapatkan ringkasan kehadiran pribadi |
| GET | `/api/attendance/:guid` | Mendapatkan detail kehadiran |
| PUT | `/api/attendance/:guid/verify` | Memverifikasi kehadiran |

### 🏢 Departemen

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/departments` | Membuat departemen baru |
| GET | `/api/departments` | Mendapatkan daftar departemen |
| GET | `/api/departments/with-inactive` | Mendapatkan semua departemen termasuk non-aktif |
| GET | `/api/departments/:guid` | Mendapatkan detail departemen |
| GET | `/api/departments/code/:code` | Mendapatkan departemen berdasarkan kode |
| PUT | `/api/departments/:guid` | Memperbarui departemen |
| DELETE | `/api/departments/:guid` | Menghapus departemen (soft delete) |
| DELETE | `/api/departments/:guid/hard` | Menghapus departemen (hard delete) |
| PUT | `/api/departments/:guid/head` | Menugaskan kepala departemen |
| PUT | `/api/departments/:guid/members` | Menambahkan anggota departemen |
| DELETE | `/api/departments/:guid/members` | Menghapus anggota departemen |
| GET | `/api/departments/by-member/:userId` | Mendapatkan departemen berdasarkan anggota |
| GET | `/api/departments/by-head/:userId` | Mendapatkan departemen berdasarkan kepala |

### 📅 Permintaan Cuti

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/leave-requests` | Membuat permintaan cuti |
| GET | `/api/leave-requests` | Mendapatkan daftar permintaan cuti |
| GET | `/api/leave-requests/my-requests` | Mendapatkan permintaan cuti pribadi |
| GET | `/api/leave-requests/pending` | Mendapatkan permintaan cuti yang tertunda |
| GET | `/api/leave-requests/:guid` | Mendapatkan detail permintaan cuti |
| PATCH | `/api/leave-requests/:guid` | Memperbarui permintaan cuti |
| DELETE | `/api/leave-requests/:guid` | Menghapus permintaan cuti |
| POST | `/api/leave-requests/:guid/review` | Meninjau permintaan cuti |
| GET | `/api/leave-requests/:guid/attachment` | Mendapatkan lampiran permintaan cuti |

### 🔄 Koreksi Kehadiran

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/corrections` | Membuat permintaan koreksi |
| GET | `/api/corrections` | Mendapatkan daftar koreksi |
| GET | `/api/corrections/my-requests` | Mendapatkan koreksi pribadi |
| GET | `/api/corrections/monthly-usage` | Mendapatkan penggunaan bulanan |
| GET | `/api/corrections/department/:departmentId/pending` | Mendapatkan koreksi tertunda per departemen |
| GET | `/api/corrections/:guid` | Mendapatkan detail koreksi |
| PUT | `/api/corrections/:guid/review` | Meninjau permintaan koreksi |

### 📊 Statistik

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/statistics` | Mendapatkan statistik kehadiran |
| GET | `/api/statistics/my-statistics` | Mendapatkan statistik kehadiran pribadi |
| POST | `/api/statistics/generate-report` | Membuat laporan statistik |
| POST | `/api/statistics/generate-my-report` | Membuat laporan statistik pribadi |
| GET | `/api/statistics/download/:fileName` | Mengunduh laporan statistik |

### 📁 Manajemen File

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/files/upload` | Mengunggah file |
| GET | `/api/files` | Mendapatkan daftar file |
| GET | `/api/files/:guid` | Mendapatkan metadata file |
| GET | `/api/files/:guid/download` | Mengunduh file |
| GET | `/api/files/:guid/view` | Melihat file |

## 🧪 Testing

```bash
# Menjalankan semua test
npm test

# Watch mode
npm run test:watch

# Test coverage
npm run test:cov

# E2E testing
npm run test:e2e

# Unit testing
npm run test:universal
```

## 📄 Lisensi

Proyek ini dilisensikan di bawah [Lisensi MIT](LICENSE).

---

<div align="center">
  <p>© 2025 E-Presensi Politani. All Rights Reserved.</p>
</div>
