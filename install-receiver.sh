#!/data/data/com.termux/files/usr/bin/bash
set -e

pkg update -y
pkg install -y nodejs termux-api

node --check receiver.js

echo
echo "Receiver siap."
echo "Paket termux-api sudah dipasang."
echo "Pastikan aplikasi Android Termux:API juga terpasang dari sumber yang sama dengan Termux."
echo "Tes getaran: termux-vibrate -d 500"
echo "Jalankan Receiver: node receiver.js"
