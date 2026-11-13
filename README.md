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
5. **HP Target saja** memerlukan aplikasi pendamping Termux:API dan paket `termux-api` di Termux. Unduh aplikasi pendamping dari [F-Droid resmi](https://f-droid.org/packages/com.termux.api/). Termux dan Termux:API harus berasal dari sumber instalasi yang sama (keduanya F-Droid). HP Controller tidak memerlukan Termux:API.

**Tentang Google Play Protect:** jangan mematikan atau melewati perlindungan untuk memasang APK. Jika instalasi diblokir, batalkan dulu, pastikan halaman unduhan benar-benar `f-droid.org`, periksa nama paket `com.termux.api`, dan jangan gunakan APK dari situs mirror atau tautan tidak dikenal. Jika tetap diblokir, biarkan perlindungan aktif dan jangan lanjutkan instalasi.

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

Installer akan memasang Node.js, paket perintah `termux-api`, dan memeriksa file Receiver. Pastikan aplikasi pendamping Termux:API dari F-Droid juga sudah terpasang di HP Target. Tes getar singkat:

```bash
termux-vibrate -d 500 -f
```

Jika HP bergetar, jalankan Receiver:

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

Saat Controller dijalankan, masukkan:
- IP Target yang tampil di Termux Target.
- Port `47831`.
- PIN Pairing enam digit dari Receiver.

Setujui pairing dengan mengetik `y` di Termux Target. Setelah terhubung, menu fitur akan tampil:

- `1` — OPEN APP. Menampilkan daftar aplikasi Target.
- `2` — LOCK DEVICE. Masukkan pesan, PIN Lock baru empat digit, dan durasi VIBRATE (1–5 menit).
- `0` — putuskan koneksi.

Di halaman LOCK DEVICE, Controller tetap berada pada layar status dan menyediakan pilihan LOCK dan UNLOCK. PIN Lock empat digit berbeda dari PIN Pairing enam digit.

Pada HP Target, halaman `http://127.0.0.1:47833` dibuka satu kali. Halaman menampilkan pesan Controller dan kolom PIN. Selama sesi aktif, Termux:API memberi getaran singkat 180 ms dengan jeda sekitar 1 detik. Durasi dapat dipilih 1–5 menit. PIN benar, UNLOCK dari Controller, durasi habis, atau Controller terputus akan menghentikan getaran dan sesi.

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

Jika nama folder hasil clone berbeda, gunakan nama folder yang benar pada setiap perintah `cd`.

---

## LOCAL DEVICE LOCK

1. Jalankan Receiver di HP Target. Catat IP dan port `47831`, lalu biarkan Termux berjalan.
2. Dari Controller, masukkan IP Target, port, dan PIN Pairing enam digit.
3. Setelah pairing disetujui, pilih `2` untuk LOCK DEVICE.
4. Masukkan pesan, PIN Lock baru empat digit, dan durasi VIBRATE (1–5 menit).
5. Controller tetap menampilkan layar LOCK DEVICE dengan pilihan LOCK dan UNLOCK.
6. Halaman lokal di browser Target menampilkan pesan dan kolom PIN.
7. PIN benar atau perintah UNLOCK dari Controller menghentikan getaran dan sesi Lock.

Halaman `lock.html` terpisah dari `receiver.js`, tetapi disajikan oleh server HTTP Receiver pada port lokal `47833`. Keduanya berkomunikasi melalui endpoint `/api/state`, `/api/unlock`, dan `/api/emergency-stop`.

Halaman Lock dibuka satu kali. Getaran singkat berlangsung berkala dengan jeda sekitar 1 detik, maksimal selama durasi yang dipilih (1–5 menit). Sesi berhenti melalui PIN benar, UNLOCK Controller, durasi habis, atau saat Controller terputus. Fitur ini bukan Android Kiosk/Device Owner dan tidak mencegah pemilik Target menutup browser atau menghentikan Receiver.

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

### 6. Getaran tidak berfungsi

- Pastikan aplikasi pendamping **Termux:API** terpasang di HP Target dari F-Droid.
- Pastikan paket perintah sudah terpasang di Termux Target: `pkg install termux-api`.
- Uji langsung dengan `termux-vibrate -d 500 -f`.
- Jika perintah tidak ditemukan, jalankan `which termux-vibrate`.
- Jika Play Protect memblokir APK, jangan mematikan perlindungan atau memasang APK dari sumber lain. Periksa sumber F-Droid dan batalkan instalasi jika sumbernya tidak dapat diverifikasi.

### 7. Aplikasi tidak terbuka

Tidak semua aplikasi yang muncul di daftar pasti bisa dibuka oleh Dual Control. Daftar package hanya menunjukkan bahwa paket aplikasi terpasang; itu **bukan jaminan** bahwa Android menyediakan Activity launcher yang bisa dipanggil dari program ini.

Beberapa penyebab aplikasi gagal dibuka:

- Aplikasi tidak memiliki ikon/Activity launcher, misalnya layanan latar belakang, plugin, komponen tambahan, atau aplikasi yang hanya dipanggil oleh aplikasi lain.
- Activity launcher aplikasi tidak dapat ditemukan oleh Android melalui intent standar, atau tidak diizinkan untuk dijalankan dari luar aplikasinya.
- Aplikasi memakai mekanisme pembukaan khusus, membutuhkan profil pengguna/ruang aplikasi tertentu, atau memiliki pembatasan dari pengembang.
- Versi Android, ColorOS, atau ROM perangkat memiliki aturan berbeda tentang peluncuran aplikasi.
- Aplikasi sudah tidak aktif, dinonaktifkan, belum selesai dipasang, atau package yang dipilih bukan aplikasi yang dimaksud.

**Yang perlu diketahui:**
- Tanda berhasil dari Controller berarti perintah sudah diproses/dikirim, bukan bukti bahwa tampilan aplikasi pasti terbuka.
- Jika Android mengembalikan pesan seperti `unable to resolve Intent`, berarti sistem tidak menemukan Activity yang cocok dengan permintaan pembukaan tersebut.
- WhatsApp dan aplikasi tertentu mungkin memerlukan nama komponen launcher khusus. Komponen satu aplikasi tidak bisa diasumsikan berlaku untuk aplikasi lain.
- Aplikasi yang tidak bisa dibuka dari Dual Control masih mungkin dapat dibuka secara normal dengan mengetuk ikonnya langsung di HP Target.

**Cara menguji:**
1. Pastikan aplikasi bisa dibuka langsung di HP Target.
2. Coba buka aplikasi itu dari Controller.
3. Jika gagal, catat nama package dan pesan error yang muncul di Receiver/Controller.
4. Jangan menganggap semua aplikasi akan didukung hanya karena namanya tampil di daftar.


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
- `install-receiver.sh` — installer Node.js dan paket perintah Termux:API untuk Receiver.
- Aplikasi pendamping Termux:API — dipasang terpisah di HP Target dari F-Droid.
- `install-controller.sh` — installer kebutuhan Controller.

**Repository:** https://github.com/julliansyahrangga-sketch/ranggacryzhack-dual-control
