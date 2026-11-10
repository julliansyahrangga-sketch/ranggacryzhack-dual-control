#!/usr/bin/env node
'use strict';

// Dual Control receiver — Android/Termux.
// Only lists third-party packages and launches a package after local pairing approval.

const net = require('net');
const readline = require('readline');
const crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');

const PORT = 47831;
const HOST = '0.0.0.0';
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

function getPackages() {
  try {
    const out = execFileSync('pm', ['list', 'packages', '-3'], { encoding: 'utf8', timeout: 15000 });
    return [...new Set(out.split(/\r?\n/).map(x => x.trim().replace(/^package:/, '')).filter(Boolean))].sort();
  } catch (e) {
    console.error('Gagal membaca daftar aplikasi:', e.message);
    return [];
  }
}

function send(socket, obj) {
  socket.write(JSON.stringify(obj) + '\n');
}

let active = false;
const pin = String(crypto.randomInt(100000, 1000000));

console.log('\n========================================');
console.log(' RANGGACRYZHACK // DUAL CONTROL RECEIVER');
console.log('========================================');
console.log('PIN pairing (jaga agar tetap pribadi): ' + pin);
console.log('Port: ' + PORT);
console.log('Pastikan kedua HP berada di Wi-Fi/hotspot yang sama.');
console.log('Tekan Ctrl+C untuk berhenti.\n');

const server = net.createServer(socket => {
  if (active) {
    send(socket, { ok: false, error: 'Receiver sedang dipakai perangkat lain.' });
    socket.end();
    return;
  }

  socket.setEncoding('utf8');
  let buffer = '';
  let paired = false;

  socket.on('data', async chunk => {
    buffer += chunk;
    while (buffer.includes('\n')) {
      const idx = buffer.indexOf('\n');
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (!line.trim()) continue;

      let msg;
      try { msg = JSON.parse(line); } catch { send(socket, { ok: false, error: 'Format pesan tidak valid.' }); continue; }

      if (!paired) {
        if (msg.action !== 'pair' || String(msg.pin || '') !== pin) {
          send(socket, { ok: false, error: 'PIN salah.' });
          socket.end();
          return;
        }
        const answer = (await ask('Izinkan HP Controller terhubung? (y/N): ')).trim().toLowerCase();
        if (answer !== 'y' && answer !== 'ya') {
          send(socket, { ok: false, error: 'Permintaan pairing ditolak di HP Receiver.' });
          socket.end();
          return;
        }
        paired = true;
        active = true;
        send(socket, { ok: true, message: 'Pairing disetujui.' });
        console.log('\nController terhubung.');
        continue;
      }

      if (msg.action === 'list') {
        const apps = getPackages();
        send(socket, { ok: true, apps });
      } else if (msg.action === 'launch') {
        const pkg = String(msg.package || '');
        const allowed = getPackages();
        if (!allowed.includes(pkg)) {
          send(socket, { ok: false, error: 'Aplikasi tidak ada dalam daftar aplikasi pengguna.' });
          continue;
        }
        // Android's monkey launcher opens the selected app; no arbitrary shell command is accepted.
        const result = spawnSync('monkey', ['-p', pkg, '1'], { encoding: 'utf8', timeout: 15000 });
        if (result.error || result.status !== 0) {
          send(socket, { ok: false, error: 'Gagal membuka aplikasi: ' + (result.error?.message || result.stderr || 'perintah gagal') });
        } else {
          send(socket, { ok: true, message: 'Perintah buka aplikasi dikirim.' });
        }
      } else if (msg.action === 'disconnect') {
        send(socket, { ok: true, message: 'Terputus.' });
        socket.end();
      } else {
        send(socket, { ok: false, error: 'Aksi tidak dikenal.' });
      }
    }
  });

  socket.on('close', () => { if (paired) active = false; });
  socket.on('error', () => { if (paired) active = false; });
});

server.on('error', err => console.error('Server error:', err.message));
server.listen(PORT, HOST, () => console.log('Receiver siap menerima permintaan pairing.'));
process.on('SIGINT', () => { console.log('\nReceiver dihentikan.'); server.close(); rl.close(); process.exit(0); });
