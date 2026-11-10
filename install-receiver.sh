#!/data/data/com.termux/files/usr/bin/bash
set -e
pkg install -y nodejs
node --check receiver.js
echo
echo "Receiver siap. Jalankan: node receiver.js"
