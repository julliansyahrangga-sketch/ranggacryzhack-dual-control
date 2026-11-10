# RANGGACRYZHACK — DUAL CONTROL

Panduan mudah memasang dan memakai Dual Control di **dua HP Android menggunakan Termux**.

**Fungsi:** HP Controller dapat meminta HP Receiver membuka aplikasi yang sudah terpasang di HP Receiver melalui Wi-Fi atau hotspot yang sama.

Repository: https://github.com/julliansyahrangga-sketch/ranggacryzhack-dual-control

---

# A. KENALI DULU

Ada dua HP dengan tugas berbeda:

| HP | Tugas |
|---|---|
| **Receiver** | HP yang aplikasinya akan dibuka |
| **Controller** | HP untuk memilih aplikasi yang ingin dibuka |

Contoh: HP adik menjadi Receiver, HP kamu menjadi Controller.

**Penting:**
- Gunakan hanya pada HP milik sendiri atau HP yang pemiliknya sudah memberi izin.
- Pemilik Receiver harus menyetujui koneksi langsung dari layar Termux Receiver.
- Program ini hanya meminta Receiver membuka aplikasi. Program ini tidak melihat layar, membaca chat/file, atau memberi akses remote shell.
- Kedua HP harus berada pada Wi-Fi yang sama. Bisa juga Controller tersambung ke hotspot Receiver.
- PIN dan IP lokal jangan dibagikan ke publik.
- Versi ini memakai IP manual. Bluetooth dan pencarian perangkat otomatis belum tersedia.

# B. PERSIAPAN DI KEDUA HP

Lakukan langkah ini pada **HP Receiver dan HP Controller**.

1. Pasang dan buka Termux.
2. Pastikan internet aktif.
3. Jalankan perintah satu per satu:

~~~bash
pkg update
pkg install git
pkg install nodejs
~~~

Jika Termux bertanya apakah ingin melanjutkan, ketik huruf y lalu tekan Enter.

**Catatan Node.js:** pada beberapa instalasi Termux, paket nodejs dapat menggantikan nodejs-lts. Baca daftar paket yang akan dihapus/dipasang. Jika setuju, ketik y lalu Enter. Jika muncul tulisan Abort, instalasi dibatalkan dan belum selesai. Ulangi perintah pkg install nodejs dan selesaikan konfirmasinya.

Periksa apakah Git dan Node.js sudah tersedia:

~~~bash
git --version
node -v
~~~

Jika keduanya menampilkan nomor versi, lanjutkan.

# C. UNDUH PROYEK DI KEDUA HP

Langkah ini dilakukan **di HP Receiver dan HP Controller**.

Jalankan:

~~~bash
git clone https://github.com/julliansyahrangga-sketch/ranggacryzhack-dual-control.git
~~~

Setelah unduhan selesai, masuk ke folder proyek:

~~~bash
cd ranggacryzhack-dual-control
~~~

Periksa isi folder:

~~~bash
pwd
ls
~~~

Seharusnya terlihat file controller.js, receiver.js, install-controller.sh, install-receiver.sh, dan README.md.

**Penting:** jangan menjalankan installer atau file JavaScript sebelum masuk ke folder proyek. Jika muncul No such file or directory, biasanya kamu belum berada di folder yang benar atau proses clone belum berhasil.

# D. SIAPKAN HP RECEIVER

Kerjakan bagian ini hanya di HP yang akan membuka aplikasi.

Masuk ke folder proyek:

~~~bash
cd ~/ranggacryzhack-dual-control
~~~

Jalankan installer Receiver:

~~~bash
bash install-receiver.sh
~~~

Jika selesai tanpa error, jalankan:

~~~bash
node receiver.js
~~~

Receiver akan menampilkan PIN enam digit dan pesan bahwa server siap menerima pairing.

**Biarkan Receiver tetap berjalan.** Jangan tutup sesi Termux tersebut selama ingin memakai Controller.

## Cari alamat IP Receiver

Buka sesi Termux lain di HP Receiver, lalu jalankan:

~~~bash
ip route
~~~

Cari alamat IP setelah tulisan src pada rute Wi-Fi/hotspot. Contoh IP: 192.168.1.155. Itu hanya contoh; gunakan IP yang benar-benar tampil di HP Receiver.

Jika sulit menemukannya, buka Pengaturan Android → Wi-Fi → jaringan yang tersambung → Detail jaringan → Alamat IP.

Catat IP tersebut. Jangan bagikan PIN atau IP kepada orang yang tidak dipercaya.

# E. SIAPKAN HP CONTROLLER

Kerjakan bagian ini di HP yang akan dipakai memilih aplikasi.

Masuk ke folder proyek:

~~~bash
cd ~/ranggacryzhack-dual-control
~~~

Jalankan installer Controller:

~~~bash
bash install-controller.sh
~~~

Jika selesai tanpa error, jalankan:

~~~bash
node controller.js
~~~

# F. HUBUNGKAN KEDUA HP

Pastikan:
- Receiver masih aktif menjalankan node receiver.js.
- Kedua HP terhubung ke Wi-Fi/hotspot yang sama.
- Kamu sudah mencatat IP Receiver.
- PIN enam digit masih terlihat di layar Receiver.

Di Controller akan muncul pertanyaan:

~~~text
IP HP Receiver:
~~~

Masukkan IP lokal Receiver, lalu tekan Enter.

Berikutnya muncul:

~~~text
PIN 6 digit:
~~~

Masukkan PIN enam digit yang sedang tampil di Receiver, lalu tekan Enter.

Sekarang lihat HP Receiver. Akan muncul pertanyaan:

~~~text
Izinkan HP Controller terhubung? (y/N):
~~~

Pemilik HP Receiver harus mengetik y lalu Enter untuk menyetujui koneksi.

Jika pemilik Receiver tidak mengenali perangkat yang meminta koneksi, jangan setujui. Ketik n atau biarkan permintaan ditolak.

# G. CARA MEMAKAI MENU

Setelah koneksi berhasil, Controller akan menampilkan daftar aplikasi dari Receiver.

Masukkan nomor aplikasi yang ingin dibuka. Controller akan meminta konfirmasi. Ketik y lalu Enter jika benar.

| Tombol/input | Kegunaan |
|---|---|
| Nomor aplikasi | Meminta Receiver membuka aplikasi tersebut |
| n | Melihat halaman aplikasi berikutnya |
| p | Kembali ke halaman sebelumnya |
| r | Memuat ulang daftar aplikasi |
| 0 | Keluar dan memutuskan koneksi |

Daftar menampilkan maksimal delapan aplikasi per halaman.

**Ingat:** aplikasi akan terbuka di HP Receiver, bukan di HP Controller.

# H. CARA KELUAR

- Di Controller, masukkan 0 untuk memutuskan koneksi.
- Di Receiver, tekan Ctrl+C pada Termux untuk menghentikan server.
- Setelah selesai, hentikan Receiver agar tidak terus menunggu koneksi.

# I. CARA UPDATE PROYEK

Jika proyek sudah pernah diunduh, jangan clone ulang. Di masing-masing HP jalankan:

~~~bash
cd ~/ranggacryzhack-dual-control
git pull
~~~

Jalankan program sesuai peran HP:

Receiver:
~~~bash
node receiver.js
~~~

Controller:
~~~bash
node controller.js
~~~

# J. MASALAH YANG SERING TERJADI

## 1. Muncul install-controller.sh: No such file or directory

Termux tidak menemukan file tersebut di folder saat ini. Jalankan:

~~~bash
cd ~/ranggacryzhack-dual-control
ls
~~~

Pastikan install-controller.sh terlihat. Lalu jalankan:

~~~bash
bash install-controller.sh
~~~

## 2. Muncul Cannot find module ... controller.js

Biasanya kamu menjalankan Node.js dari folder yang salah. Jalankan:

~~~bash
cd ~/ranggacryzhack-dual-control
ls
node controller.js
~~~

## 3. Muncul Abort saat memasang Node.js

Proses pemasangan dibatalkan. Ulangi:

~~~bash
pkg install nodejs
~~~

Baca daftar perubahan paket. Jika setuju, ketik y lalu tekan Enter sampai instalasi selesai. Jangan lanjut sebelum perintah selesai.

## 4. Controller tidak bisa terhubung

- Pastikan Receiver masih aktif.
- Periksa IP Receiver, jangan gunakan IP Controller.
- Pastikan kedua HP berada pada Wi-Fi/hotspot yang sama.
- Masukkan PIN yang sedang tampil di Receiver.
- Pastikan jaringan tidak menghalangi komunikasi antarperangkat.
- Port TCP program adalah 47831.

## 5. PIN salah

Gunakan PIN terbaru yang terlihat di layar Receiver. Jika Receiver dimulai ulang, PIN akan berubah.

## 6. Daftar aplikasi kosong atau aplikasi gagal dibuka

- Pastikan aplikasi sudah terpasang di Receiver.
- Coba buka aplikasi tersebut langsung dari HP Receiver.
- Beberapa versi Android atau aplikasi dapat membatasi daftar paket atau peluncuran aplikasi dari program lain.

## 7. Perintah Git gagal

Pastikan internet aktif dan Git sudah terpasang:

~~~bash
pkg install git
git --version
~~~

Jika folder proyek belum ada, ulangi perintah clone pada Bagian C. Jika folder sudah ada, masuk ke folder itu dan jalankan git pull.

# INFORMASI TEKNIS

- Platform: Android + Termux
- Runtime: Node.js
- Protokol: TCP
- Port: 47831
- Controller: controller.js
- Receiver: receiver.js
- Installer Controller: install-controller.sh
- Installer Receiver: install-receiver.sh

Kompatibilitas dapat berbeda tergantung versi Android dan merek HP. Gunakan hanya di jaringan lokal tepercaya. Jangan membuka atau meneruskan port Receiver ke internet.
