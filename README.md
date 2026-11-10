# RANGGACRYZHACK — DUAL CONTROL

Menghubungkan dua HP Android melalui Wi-Fi atau hotspot yang sama. HP Controller dapat meminta HP Target membuka aplikasi yang terpasang, setelah pemilik HP Target menyetujui koneksi.

## 1. INSTALASI

**Lakukan persiapan ini di KEDUA HP** melalui Termux:

```bash
pkg update -y
pkg install -y git
git clone https://github.com/julliansyahrangga-sketch/ranggacryzhack-dual-control.git
cd ranggacryzhack-dual-control
```

### HP TARGET — Fahri nak meletup

Jalankan di HP Target:

```bash
bash install-receiver.sh
node receiver.js
```

Biarkan Termux tetap berjalan. Catat **IP** dan **PIN 6 digit** yang ditampilkan.

### HP CONTROLLER — botak pinang

Jalankan di HP Controller:

```bash
cd ranggacryzhack-dual-control
bash install-controller.sh
node controller.js
```

## 2. CARA PAKAI

1. Sambungkan kedua HP ke Wi-Fi yang sama, atau sambungkan Controller ke hotspot Target.
2. Pastikan program Receiver di HP **Fahri nak meletup** masih berjalan.
3. Di HP **botak pinang**, masukkan IP Target saat diminta.
4. Masukkan PIN 6 digit yang terlihat di HP Target.
5. Lihat HP Target. Pemiliknya harus menyetujui permintaan koneksi dengan mengetik `y` lalu Enter.
6. Setelah terhubung, pilih nomor aplikasi di Controller untuk membukanya di HP Target.

**Menu Controller:** `n` halaman berikutnya · `p` halaman sebelumnya · `r` muat ulang aplikasi · `0` putuskan koneksi.

## CATATAN PENTING

- Gunakan hanya pada HP milik sendiri atau dengan izin pemiliknya.
- Pemilik HP Target harus menyetujui setiap koneksi.
- Aplikasi dibuka di HP Target, bukan di Controller.
- Program ini tidak mengontrol layar atau membaca isi HP.
- Jangan bagikan IP dan PIN kepada orang yang tidak dipercaya.
- Jika koneksi gagal, periksa Wi-Fi/hotspot, IP, PIN terbaru, dan pastikan Receiver masih aktif.

## UPDATE

Di masing-masing HP, masuk ke folder proyek lalu jalankan:

```bash
cd ~/ranggacryzhack-dual-control
git pull
```

Jalankan kembali sesuai peran:

- Target: `node receiver.js`
- Controller: `node controller.js`
