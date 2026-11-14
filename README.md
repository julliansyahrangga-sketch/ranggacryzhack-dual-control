# RANGGACRYZHACK DUAL CONTROL

Program untuk menghubungkan **dua HP Android** melalui Wi-Fi atau hotspot yang sama.

- **HP Target**: HP yang menerima koneksi dan menjalankan perintah yang disetujui pemiliknya.
- **HP Controller**: HP yang digunakan untuk mengirim perintah.
- Pemilik HP Target harus menyetujui pairing di Termux Target.
- Gunakan hanya pada perangkat milik sendiri atau perangkat yang pemiliknya memberi izin.

## 1. KEBUTUHAN

Siapkan dua HP Android dan lakukan pemasangan sesuai peran:

| Kebutuhan | HP Target | HP Controller |
|---|---:|---:|
| Aplikasi Termux | Wajib | Wajib |
| Git | Wajib | Wajib |
| Node.js | Wajib | Wajib |
| Paket Termux:API di Termux | Wajib untuk VIBRATOR | Tidak perlu |
| Aplikasi Android Termux:API | Wajib untuk VIBRATOR | Tidak perlu |

**Penting tentang Termux:API:** pada HP Target, ada dua hal yang harus terpasang:
1. Aplikasi Android **Termux:API**.
2. Paket command-line **termux-api** di dalam Termux.

Pasang aplikasi Termux dan Termux:API dari sumber distribusi/tanda tangan yang sama. Contohnya, bila Termux dipasang dari GitHub, gunakan aplikasi Termux:API dari distribusi GitHub juga. Jangan mencampur APK dari sumber yang tanda tangannya berbeda karena bisa menyebabkan kesalahan tanda tangan saat instalasi.

Proyek ini menggunakan modul bawaan Node.js. **Tidak perlu menjalankan `npm install`** dan tidak memerlukan file `package.json`.

## 2. PERSIAPAN TERMUX DI KEDUA HP

Buka aplikasi Termux, lalu jalankan perintah berikut pada **masing-masing HP**:

```bash
pkg update -y && pkg upgrade -y
pkg install -y git nodejs
node -v
git --version
```

Pastikan `node -v` dan `git --version` menampilkan nomor versi, bukan pesan command not found.

Jika Termux meminta konfirmasi saat memperbarui paket, ikuti instruksi yang tampil di layar.

## 3. PERSIAPAN KHUSUS HP TARGET — TERMUX:API

Langkah ini hanya untuk HP Target.

### A. Pasang aplikasi Android Termux:API

Pasang aplikasi **Termux:API** pada Android Target dari sumber yang tanda tangannya sama dengan aplikasi Termux yang digunakan. Buka aplikasi Termux:API sekali setelah instalasi bila diminta oleh Android.

### B. Pasang paket Termux:API di dalam Termux

Jalankan di Termux Target:

```bash
pkg update -y
pkg install -y termux-api
```

### C. Tes getaran sebelum menjalankan proyek

Jalankan:

```bash
termux-vibrate -d 500
```

HP Target seharusnya bergetar singkat. Jika muncul `command not found`, ulangi pemasangan paket `termux-api`. Jika command tersedia tetapi API tidak merespons, periksa apakah aplikasi Android Termux:API sudah terpasang dari sumber yang sama dengan Termux.

## 4. UNDUH PROYEK DI KEDUA HP

Lakukan di Termux Target dan Termux Controller.

Jika folder proyek **belum ada**, jalankan:

```bash
cd ~
git clone https://github.com/julliansyahrangga-sketch/ranggacryzhack-dual-control.git
cd ~/ranggacryzhack-dual-control
```

Jika folder proyek **sudah ada**, jangan clone ulang. Masuk ke folder yang sudah ada dan perbarui:

```bash
cd ~/ranggacryzhack-dual-control
git pull --ff-only origin main
```

Periksa file proyek:

```bash
ls
```

File penting yang harus terlihat antara lain `controller.js`, `receiver.js`, `lock.html`, `install-controller.sh`, dan `install-receiver.sh`.

## 5. INSTALL DAN JALANKAN HP TARGET

Pastikan aplikasi Android Termux:API sudah terpasang sebelum menggunakan VIBRATOR.

Di Termux HP Target:

```bash
cd ~/ranggacryzhack-dual-control
bash install-receiver.sh
```

Installer Target akan:
- memperbarui daftar paket;
- memasang Node.js;
- memasang paket command-line Termux:API;
- memeriksa sintaks `receiver.js`.

Setelah installer selesai, tes lagi Termux:API:

```bash
termux-vibrate -d 500
```

Lalu jalankan Receiver:

```bash
node receiver.js
```

Catat informasi yang tampil:
- **IP ADDRESS** — alamat IP HP Target pada jaringan saat ini.
- **PORT** — gunakan `47831` untuk koneksi Controller.
- **PAIRING PIN** — PIN enam digit yang dibuat saat Receiver dijalankan.

Biarkan Termux Target dan Receiver tetap berjalan selama digunakan. Jangan tutup sesi tersebut.

## 6. INSTALL DAN JALANKAN HP CONTROLLER

Di Termux HP Controller:

```bash
cd ~/ranggacryzhack-dual-control
bash install-controller.sh
node controller.js
```

Installer Controller memasang Node.js dan memeriksa sintaks `controller.js`.

Pada menu awal:
- Pilih `2` jika kedua HP memakai Wi-Fi yang sama.
- Pilih `3` jika memakai hotspot. Aktifkan hotspot di HP Controller, lalu sambungkan HP Target ke hotspot tersebut.

Masukkan data dari HP Target:
- IP Target yang tampil di Receiver;
- port `47831`;
- PIN Pairing enam digit.

## 7. SETUJUI PAIRING DI HP TARGET

Setelah Controller menghubungi Target, Termux Target menampilkan permintaan izin koneksi.

Periksa bahwa koneksi berasal dari HP milikmu, lalu ketik:

```text
y
```

Tekan Enter. Jika ditolak, Controller tidak akan terhubung.

## 8. CARA MENGGUNAKAN FITUR

Setelah pairing disetujui, menu Controller menampilkan:

- `1` — OPEN APP: menampilkan daftar aplikasi pihak ketiga di Target dan meminta Android membuka aplikasi yang dipilih.
- `2` — LOCK DEVICE: membuka halaman lokal Lock di Target dan menampilkan kontrol Lock/Unlock.
- `0` — DISCONNECT: memutus koneksi Controller.

Di dalam menu LOCK DEVICE:

- `1` — LOCK.
- `2` — UNLOCK.
- `3` — VIBRATOR.
- `4` — STOP VIBRATOR.
- `0` — kembali.

### Pengaturan VIBRATOR

Saat memilih `3`, Controller meminta tiga nilai:

| Pengaturan | Batas |
|---|---:|
| Durasi sesi | 1–5 menit |
| Lama getaran setiap pulsa | 100–1000 ms |
| Jeda antar-getaran | 250–10000 ms |

Getaran akan berhenti otomatis setelah durasi berakhir. Getaran juga dapat dihentikan dengan pilihan `4`, perintah UNLOCK, saat Controller terputus, atau saat Receiver dihentikan dengan `CTRL + C`.

### Halaman Local Lock

Halaman lokal berjalan di Target pada:

```text
http://127.0.0.1:47833
```

Halaman menyediakan kolom PIN dan tombol darurat `RanggaCryzSOS`. Gunakan fitur Lock hanya pada perangkat sendiri dengan durasi yang singkat. Pembukaan ulang Chrome dapat mengganggu penggunaan HP; pemilik Target tetap dapat menghentikan sesi melalui SOS, PIN yang benar, atau Controller.

## 9. MENJALANKAN LAGI SETELAH TERMUX DITUTUP

Tidak perlu clone atau instal ulang.

**HP Target:**

```bash
cd ~/ranggacryzhack-dual-control
node receiver.js
```

**HP Controller:**

```bash
cd ~/ranggacryzhack-dual-control
node controller.js
```

Gunakan IP dan PIN Pairing terbaru yang ditampilkan Receiver. PIN dapat berubah setiap kali Receiver dijalankan ulang.

## 10. UPDATE KE VERSI TERBARU

Hentikan program yang sedang berjalan dengan `CTRL + C` pada masing-masing HP. Kemudian jalankan di folder proyek pada kedua HP:

```bash
cd ~/ranggacryzhack-dual-control
git pull --ff-only origin main
```

Setelah update, jalankan kembali Receiver di Target dan Controller di Controller sesuai langkah sebelumnya.

Jika Git menampilkan pesan bahwa branch lokal dan remote berbeda (*divergent branches*), **jangan gunakan `git reset --hard`**. Periksa perubahan lokal terlebih dahulu agar pekerjaan yang belum tersimpan tidak hilang.

## 11. TROUBLESHOOTING

### `node: command not found`

Jalankan:

```bash
pkg update -y
pkg install -y nodejs
node -v
```

### `termux-vibrate: command not found`

Jalankan di HP Target:

```bash
pkg update -y
pkg install -y termux-api
command -v termux-vibrate
```

Pastikan aplikasi Android Termux:API juga sudah terpasang.

### VIBRATOR gagal atau muncul pesan Termux:API

Tes langsung di Termux Target:

```bash
termux-vibrate -d 500
```

Jika tes langsung gagal, periksa pemasangan aplikasi Android Termux:API dan paket command-line `termux-api`. Jika tes langsung berhasil tetapi fitur Controller gagal, hentikan Receiver dengan `CTRL + C`, perbarui repository di Target, lalu jalankan Receiver kembali.

### Controller tidak menemukan Receiver

- Pastikan kedua HP terhubung ke jaringan Wi-Fi/hotspot yang sama.
- Pastikan Receiver masih berjalan di Target.
- Untuk mode hotspot, Target harus tersambung ke hotspot Controller.
- Masukkan IP Target dan PIN Pairing terbaru secara manual.
- Periksa apakah VPN atau pengaturan jaringan menghalangi koneksi lokal.

### Muncul `Perintah tidak dikenal`

Biasanya Receiver yang sedang berjalan masih menggunakan proses atau file versi lama. Di terminal Receiver, tekan `CTRL + C`, masuk ke folder proyek, perbarui file, lalu jalankan ulang:

```bash
cd ~/ranggacryzhack-dual-control
git pull --ff-only origin main
node receiver.js
```

### `lock.html tidak ditemukan`

Pastikan file `lock.html` ada di folder proyek:

```bash
cd ~/ranggacryzhack-dual-control
ls lock.html
git pull --ff-only origin main
```

### Aplikasi tidak terbuka

Tidak semua aplikasi yang terpasang memiliki Activity launcher yang dapat dipanggil oleh Android. Jika gagal, catat nama package dan pesan error dari Receiver. Aplikasi yang tidak dapat dibuka dari Controller mungkin tetap bisa dibuka langsung dari ikon di HP Target.

## 12. KEAMANAN DAN BATASAN

- Gunakan hanya pada perangkat milik sendiri atau dengan izin pemiliknya.
- Pairing harus disetujui secara langsung di HP Target.
- Jaga PIN Pairing dan PIN Lock agar tidak diketahui orang lain.
- Program ini bukan remote desktop dan tidak menyediakan kontrol layar atau sentuhan.
- Jangan tutup Receiver saat sesi masih digunakan; hentikan sesi terlebih dahulu.
- Perilaku beberapa fitur dapat berbeda bergantung versi Android dan antarmuka pabrikan.

## FILE PROYEK

- `receiver.js` — program pada HP Target.
- `controller.js` — program pada HP Controller.
- `lock.html` — halaman Local Lock.
- `install-receiver.sh` — memasang Node.js dan paket Termux:API pada HP Target.
- `install-controller.sh` — memasang Node.js pada HP Controller.

**Repository:** https://github.com/julliansyahrangga-sketch/ranggacryzhack-dual-control
