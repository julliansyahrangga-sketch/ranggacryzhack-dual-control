#!/data/data/com.termux/files/usr/bin/bash
set -e
pkg install -y nodejs
node --check controller.js
echo
echo "Controller siap. Jalankan: node controller.js"
