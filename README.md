# RANGGACRYZHACK DUAL CONTROL

Program untuk menghubungkan **dua HP Android** melalui Wi-Fi atau hotspot yang sama.

- **HP Target**: HP yang akan membuka aplikasi.
- **HP Controller**: HP yang digunakan untuk memilih aplikasi yang akan dibuka di HP Target.
- Pemilik HP Target harus menyetujui permintaan koneksi terlebih dahulu.
- Program ini hanya meminta HP Target membuka aplikasi. Program ini tidak mengendalikan layar, membaca pesan, atau mengambil alih HP.

---

## PANDUAN INSTALASI DARI NOL

Ikuti langkah sesuai peran HP. **Lakukan instalasi pada kedua HP**, satu sebagai Target dan satu sebagai Controller.

### Persiapan

1. Pasang aplikasi Termux pada kedua HP.
2. Buka Termux dan pastikan internet aktif.
3. Jangan tutup Termux selama program sedang digunakan.
4. Kedua HP harus berada pada jaringan yang sama. Bisa memakai Wi-Fi yang sama atau Controller tersambung ke hotspot Target.

> Jika perintah `pkg` tidak dikenali, pastikan kamu menjalankan perintah di aplikasi Termux, bukan terminal aplikasi lain.

### LANGKAH 1 — Unduh repository di KEDUA HP

Salin dan jalankan perintah ini di Termux HP Target dan HP Controller:

```bash
pkg update -y
pkg install -y git
git clone https://github.com/julliansyahrangga-sketch/ranggacryzhack-dual-control.git
cd ranggacryzhack-dual-control
```

Jika muncul pesan bahwa folder sudah ada, jangan clone ulang ke folder yang sama. Masuk ke folder yang sudah ada:

```bash
cd ~/ranggacryzhack-dual-control
```

Periksa file proyek:

```bash
ls
```

Seharusnya terlihat file seperti `controller.js`, `receiver.js`, `install-controller.sh`, dan `install-receiver.sh`.

### LANGKAH 2 — Siapkan HP TARGET

Lakukan bagian ini hanya di HP yang akan membuka aplikasi.

Pastikan Termux sedang berada di folder repository, lalu jalankan:

```bash
cd ~/ranggacryzhack-dual-control
bash install-receiver.sh
```

Installer akan memasang Node.js dan memeriksa file Receiver. Setelah selesai, jalankan:

```bash
node receiver.js
```

Receiver akan menampilkan:
- **IP ADDRESS** — alamat jaringan HP Target.
- **PORT** — port koneksi program.
- **PAIRING PIN** — PIN enam digit untuk menghubungkan Controller.

Catat IP dan PIN tersebut. Biarkan Receiver tetap berjalan. Jangan tutup sesi Termux ini.

### LANGKAH 3 — Siapkan HP CONTROLLER

Di HP Controller, buka Termux dan jalankan:

```bash
cd ~/ranggacryzhack-dual-control
bash install-controller.sh
```

Setelah installer selesai, jalankan:

```bash
node controller.js
```

Pilih mode koneksi:
- `2` untuk Wi-Fi yang sama.
- `3` untuk koneksi melalui hotspot.

Jika Receiver tidak ditemukan otomatis, masukkan IP HP Target dan PIN enam digit yang tampil di HP Target.

### LANGKAH 4 — Setujui koneksi di HP TARGET

Setelah Controller menghubungi Target, lihat Termux di HP Target. Akan muncul permintaan persetujuan.

Ketik:

```text
y
```

Lalu tekan Enter. Jangan menyetujui koneksi dari perangkat yang tidak kamu kenal atau tidak kamu izinkan.

### LANGKAH 5 — Gunakan Controller

Setelah terhubung, daftar aplikasi akan muncul di HP Controller. Pilih nomor aplikasi untuk meminta HP Target membukanya.

Perintah menu:
- `n` — halaman berikutnya.
- `p` — halaman sebelumnya.
- `r` — muat ulang daftar aplikasi.
- `0` — putuskan koneksi.

Daftar aplikasi difilter di HP Target agar aplikasi sistem bawaan tidak ikut ditampilkan.

---

## CARA MENJALANKAN LAGI SETELAH TERMUX DITUTUP

Tidak perlu clone atau instal ulang.

**Di HP Target:**
```bash
cd ~/ranggacryzhack-dual-control
node receiver.js
```

**Di HP Controller:**
```bash
cd ~/ranggacryzhack-dual-control
node controller.js
```

Gunakan IP dan PIN terbaru yang ditampilkan Receiver.

---

## UPDATE KE VERSI TERBARU

Hentikan program yang sedang berjalan dengan `CTRL + C`, lalu jalankan di masing-masing HP:

```bash
cd ~/ranggacryzhack-dual-control
git pull
```

Setelah update, jalankan kembali sesuai peran:

**Target**
```bash
node receiver.js
```

**Controller**
```bash
node controller.js
```

Jika folder hasil clone kamu memakai nama lain, misalnya `dual-control-baru`, ganti perintah `cd` menjadi:

```bash
cd ~/dual-control-baru
```

---

## TROUBLESHOOTING

### 1. `bash: install-receiver.sh: No such file` atau file tidak ditemukan

Masuk ke folder repository terlebih dahulu:

```bash
cd ~/ranggacryzhack-dual-control
ls
```

Jika folder belum ada, ulangi proses clone pada Langkah 1.

### 2. `node: command not found`

Pasang Node.js melalui installer sesuai peran:

```bash
cd ~/ranggacryzhack-dual-control
bash install-receiver.sh
```

Untuk HP Controller, gunakan `bash install-controller.sh`.

### 3. `CANNOT LINK EXECUTABLE` atau pesan `cannot locate symbol`

Coba perbarui paket Termux:

```bash
pkg update
pkg upgrade -y
pkg reinstall nodejs -y
node -v
```

Jika masih gagal, kirim pesan error lengkap untuk diperiksa. Jangan hapus folder proyek.

### 4. Controller tidak menemukan Receiver

- Pastikan kedua HP berada pada Wi-Fi yang sama, atau Controller tersambung ke hotspot Target.
- Pastikan Receiver masih berjalan.
- Jika pencarian otomatis gagal, masukkan IP dan PIN secara manual.
- Matikan VPN sementara jika koneksi lokal terganggu.

### 5. PIN salah atau koneksi ditolak

Gunakan PIN terbaru yang sedang tampil di HP Target. Pastikan pemilik Target menyetujui permintaan dengan mengetik `y`.

### 6. Aplikasi tidak terbuka

Pastikan aplikasi tersebut memang terpasang dan bisa dibuka secara normal di HP Target. Dukungan pembukaan aplikasi dapat berbeda antarperangkat dan versi Android.

---

## KEAMANAN DAN BATASAN

- Gunakan hanya pada perangkat milik sendiri atau dengan izin pemiliknya.
- Pemilik HP Target harus menyetujui pairing.
- Jangan membagikan PIN kepada orang yang tidak dipercaya.
- IP dan PIN hanya untuk koneksi jaringan lokal yang sedang digunakan.
- Program ini bukan aplikasi remote desktop dan tidak menyediakan kontrol layar atau sentuhan.
- Beberapa versi Android atau antarmuka pabrikan dapat membatasi pembukaan aplikasi dari proses latar belakang.

## FILE PROYEK

- `receiver.js` — program di HP Target.
- `controller.js` — program di HP Controller.
- `install-receiver.sh` — installer kebutuhan Receiver.
- `install-controller.sh` — installer kebutuhan Controller.

**Repository:** https://github.com/julliansyahrangga-sketch/ranggacryzhack-dual-control
