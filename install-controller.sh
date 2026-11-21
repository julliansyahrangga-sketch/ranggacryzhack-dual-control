#!/data/data/com.termux/files/usr/bin/bash
set -e
pkg install -y nodejs
node --check controller.js
echo
echo "Controller siap. Jalankan: node controller.js"
if command -v cloudflared >/dev/null 2>&1; then
  echo "Cloudflared ditemukan. Dashboard tunnel akan dicoba otomatis setelah pairing."
else
  echo "Cloudflared belum ditemukan. Dashboard masih dapat dipakai setelah memasang cloudflared."
  echo "Perintah tunnel manual: cloudflared tunnel --url http://127.0.0.1:47834"
fi
