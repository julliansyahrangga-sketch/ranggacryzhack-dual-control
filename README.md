# RANGGACRYZHACK — Dual Control

Panduan lengkap memasang dan menggunakan Dual Control melalui Termux di dua HP Android.

Dual Control memungkinkan HP Controller meminta HP Receiver membuka aplikasi yang sudah terpasang. Koneksi memakai Wi-Fi atau hotspot yang sama.

**Repository:** https://github.com/julliansyahrangga-sketch/ranggacryzhack-dual-control

---

## 1. Cara kerja dan batasan

- **HP Receiver** adalah HP yang aplikasinya akan dibuka.
- **HP Controller** adalah HP yang mengirim permintaan untuk membuka aplikasi.
- Receiver menampilkan PIN enam digit dan meminta persetujuan langsung dari pemilik HP sebelum Controller dapat terhubung.
- Controller hanya dapat meminta Receiver membuka aplikasi pihak ketiga yang terdeteksi. Program ini bukan remote desktop: tidak menampilkan layar, tidak membaca file, tidak mengakses pesan, dan tidak menyediakan remote shell.
- Versi ini memakai input IP secara manual. Penemuan perangkat otomatis dan Bluetooth belum tersedia.
- Gunakan hanya pada perangkat milik sendiri atau dengan izin jelas dari pemilik HP Receiver.

**Jangan bagikan PIN pairing atau IP lokal ke publik.** PIN hanya untuk sesi pairing saat itu.

## 2. Persiapan

Siapkan:
1. Dua HP Android.
2. Termux pada kedua HP.
3. Koneksi Wi-Fi yang sama, atau sambungkan Controller ke hotspot Receiver.
4. Ruang penyimpanan yang cukup dan koneksi internet untuk mengunduh Node.js serta repository.

Pastikan kedua HP benar-benar berada pada jaringan yang sama. Jika memakai hotspot, aktifkan hotspot di Receiver lalu sambungkan Controller ke hotspot tersebut.

## 3. Instalasi di HP Receiver

Lakukan langkah ini pada HP yang akan menerima perintah membuka aplikasi.

Buka Termux, lalu jalankan:

\`\`\`bash
pkg update
pkg install nodejs git
git clone https://github.com/julliansyahrangga-sketch/ranggacryzhack-dual-control.git
cd ranggacryzhack-dual-control
bash install-receiver.sh
\`\`\`

Jika proses selesai tanpa error, jalankan:

\`\`\`bash
node receiver.js
\`\`\`

Receiver akan menampilkan PIN enam digit dan pesan bahwa server siap menerima pairing. **Biarkan Termux Receiver tetap berjalan.** Jangan tutup sesi Termux tersebut.

### Melihat IP HP Receiver

Buka sesi Termux lain di HP Receiver (atau hentikan sementara Receiver dengan Ctrl+C, lalu jalankan perintah ini):

\`\`\`bash
ip route
\`\`\`

Cari alamat IP lokal pada baris rute jaringan Wi-Fi/hotspot. Biasanya tertulis setelah kata \`src\`, misalnya \`192.168.1.155\`.

Jika perintah itu tidak menampilkan alamat yang jelas, buka **Pengaturan Android → Wi-Fi → jaringan yang sedang tersambung → Detail/Jaringan**, lalu cari **Alamat IP**.

Catat IP tersebut untuk dimasukkan ke Controller. Setelah itu jalankan lagi \`node receiver.js\` bila tadi dihentikan.

## 4. Instalasi di HP Controller

Lakukan langkah ini pada HP yang akan digunakan untuk memilih aplikasi.

Buka Termux, lalu jalankan:

\`\`\`bash
pkg update
pkg install nodejs git
git clone https://github.com/julliansyahrangga-sketch/ranggacryzhack-dual-control.git
cd ranggacryzhack-dual-control
bash install-controller.sh
\`\`\`

Jalankan Controller:

\`\`\`bash
node controller.js
\`\`\`

## 5. Menghubungkan kedua HP

Pastikan:
- Receiver masih menjalankan \`node receiver.js\`.
- Kedua HP terhubung ke Wi-Fi/hotspot yang sama.
- Kamu sudah mencatat IP Receiver.
- PIN enam digit masih terlihat pada layar Receiver.

Di Controller:
1. Saat diminta \`IP HP Receiver:\`, masukkan IP lokal Receiver, misalnya \`192.168.1.155\`.
2. Saat diminta \`PIN 6 digit:\`, masukkan PIN yang tampil di Receiver.
3. Lihat layar Receiver. Pemilik HP Receiver harus membaca permintaan koneksi dan mengetik \`y\` lalu Enter untuk menyetujuinya.
4. Jika Receiver menolak atau pemiliknya tidak menyetujui, koneksi tidak akan dilanjutkan.

Jangan menerima permintaan pairing yang tidak kamu kenali.

## 6. Menggunakan menu Controller

Setelah pairing berhasil, Controller akan meminta daftar aplikasi dari Receiver.

Perintah menu:

| Input | Fungsi |
|---|---|
| Nomor aplikasi | Meminta Receiver membuka aplikasi dengan nomor tersebut |
| \`n\` | Berpindah ke halaman daftar berikutnya |
| \`p\` | Kembali ke halaman sebelumnya |
| \`r\` | Memuat ulang daftar aplikasi |
| \`0\` | Memutuskan koneksi dan keluar |

Daftar ditampilkan delapan aplikasi per halaman. Setelah memilih nomor aplikasi, Controller meminta konfirmasi \`y/N\`. Ketik \`y\` jika memang ingin mengirim permintaan membuka aplikasi tersebut.

Aplikasi akan terbuka di HP Receiver, bukan di HP Controller.

## 7. Menghentikan program

- Untuk keluar dari Controller, pilih \`0\`.
- Untuk menghentikan Receiver, tekan **Ctrl+C** pada sesi Termux Receiver.
- Jika sudah selesai, hentikan Receiver agar tidak terus menunggu koneksi.

## 8. Memperbarui file dari GitHub

Jika repository sudah pernah di-clone, buka folder proyek pada masing-masing HP:

\`\`\`bash
cd ~/ranggacryzhack-dual-control
git pull
\`\`\`

Kemudian jalankan kembali program sesuai peran HP:

\`\`\`bash
node receiver.js
\`\`\`

atau:

\`\`\`bash
node controller.js
\`\`\`

Jika folder proyek belum ada, ikuti langkah instalasi pada bagian 3 atau 4.

## 9. Mengatasi masalah umum

### Controller menampilkan koneksi gagal atau timeout
- Pastikan Receiver sedang berjalan dan menampilkan pesan siap.
- Periksa kembali IP Receiver; jangan masukkan IP Controller.
- Pastikan kedua HP berada di Wi-Fi/hotspot yang sama.
- Matikan VPN sementara jika VPN mengubah jalur jaringan lokal.
- Pastikan tidak ada salah ketik pada IP atau port. Port program adalah TCP \`47831\`.

### PIN salah
- Masukkan enam digit PIN yang sedang tampil pada Receiver.
- Jika Receiver sudah dimulai ulang, gunakan PIN baru yang tampil.
- Jangan menambahkan spasi atau karakter lain.

### Receiver menolak pairing
- Periksa layar Receiver. Ketik \`y\` hanya jika kamu mengenali perangkat Controller dan memang ingin mengizinkannya.
- Jika menolak, mulai koneksi baru dari Controller.

### Daftar aplikasi kosong atau tidak lengkap
- Receiver mengambil daftar aplikasi pihak ketiga melalui perintah Android \`pm list packages -3\`.
- Beberapa aplikasi sistem tidak ditampilkan.
- Perilaku daftar paket dapat berbeda antarversi Android dan vendor.

### Aplikasi gagal dibuka
- Pastikan aplikasi tersebut masih terpasang di Receiver.
- Coba buka aplikasi secara manual terlebih dahulu.
- Beberapa aplikasi atau versi Android membatasi peluncuran dari aplikasi lain.

### Perintah \`git clone\` atau \`git pull\` gagal
- Periksa koneksi internet.
- Pastikan paket Git terpasang dengan \`pkg install git\`.
- Jika folder proyek sudah ada, masuk ke folder tersebut sebelum menjalankan \`git pull\`. Jangan menjalankan \`git clone\` berulang kali di folder yang sama.

## 10. Informasi teknis

- Bahasa: JavaScript (Node.js)
- Platform yang dituju: Termux pada Android
- Protokol: TCP
- Port: \`47831\`
- File Receiver: \`receiver.js\`
- File Controller: \`controller.js\`
- Skrip pemeriksaan instalasi: \`install-receiver.sh\` dan \`install-controller.sh\`

## Catatan kompatibilitas

Android dan antarmuka vendor dapat berbeda. Fitur jaringan, visibilitas paket, serta pembukaan aplikasi mungkin tidak bekerja sama pada semua perangkat. Gunakan jaringan lokal tepercaya dan jangan mengekspos port Receiver ke internet.
