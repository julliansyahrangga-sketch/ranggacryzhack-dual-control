#!/data/data/com.termux/files/usr/bin/bash
set -e
pkg install -y nodejs termux-api
node --check receiver.js
echo
echo "Receiver dan paket perintah Termux:API siap."
echo "Pastikan aplikasi Termux:API juga terpasang dari F-Droid."
echo "Tes getar: termux-vibrate -d 500 -f"
echo "Jalankan Receiver: node receiver.js"
