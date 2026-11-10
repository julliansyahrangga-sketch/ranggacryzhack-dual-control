# RANGGACRYZHACK — DUAL CONTROL

Menghubungkan dua HP Android melalui Wi-Fi atau hotspot yang sama. HP Controller dapat meminta HP Target membuka aplikasi yang terpasang, setelah pemilik HP Target menyetujui koneksi.

## 1. INSTALASI

**Lakukan di KEDUA HP** melalui Termux. Perintah ini mengunduh seluruh file proyek, termasuk `receiver.js`, `controller.js`, dan installer:

```bash
pkg update -y
pkg install -y git
git clone https://github.com/julliansyahrangga-sketch/ranggacryzhack-dual-control.git
cd ranggacryzhack-dual-control
```

> Jangan jalankan perintah `bash install-receiver.sh` atau `node receiver.js` sebelum masuk ke folder hasil clone. Kalau file tidak ditemukan, berarti folder yang sedang dibuka bukan salinan repo yang lengkap.

### HP TARGET — Fahri nak meletup

Jalankan setelah berada di folder proyek:

```bash
bash install-receiver.sh
node receiver.js
```

Biarkan Termux tetap berjalan. Catat **IP** dan **PIN 6 digit** yang ditampilkan.

### HP CONTROLLER — botak pinang

Clone repo di HP Controller juga, lalu jalankan:

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

## JIKA FILE TIDAK DITEMUKAN

Pastikan kamu berada di folder repo yang benar:

```bash
cd ~/ranggacryzhack-dual-control
ls
```

Jika folder belum ada, jalankan perintah clone pada bagian Instalasi. Jika folder sudah ada tetapi isinya tidak lengkap, pindah keluar folder lalu clone ulang dengan nama folder baru:

```cd ~
git clone https://github.com/julliansyahrangga-sketch/ranggacryzhack-dual-control.git dual-control-baru
cd ~/dual-control-baru
ls
```

## TROUBLESHOOTING TERMUX

### 1. `install-receiver.sh: command not found`

Pastikan sudah berada di folder proyek, lalu panggil installer melalui Bash:

```bash
cd ~/ranggacryzhack-dual-control
bash install-receiver.sh
```

Jika folder hasil clone bernama `dual-control-baru`, gunakan:

```bash
cd ~/dual-control-baru
bash install-receiver.sh
```

### 2. Node.js menampilkan `CANNOT LINK EXECUTABLE`

Pesan seperti `cannot locate symbol` biasanya menunjukkan paket Node.js dan library Termux tidak cocok atau belum diperbarui. Coba perbarui paket terlebih dahulu:

```bash
pkg update
pkg upgrade -y
```

Jika error masih muncul, instal ulang Node.js:

```bash
pkg uninstall nodejs -y
pkg install nodejs -y
node -v
```

Jika masih gagal, jangan hapus folder proyek. Kirim pesan error lengkap dan versi Termux untuk diperiksa lebih lanjut.

### 3. `git pull` mengatakan `Already up to date`

Artinya salinan proyek lokal sudah sama dengan versi terbaru yang tersedia pada branch yang sedang digunakan. Pastikan perintah dijalankan dari dalam folder repo hasil clone.

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
