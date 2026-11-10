'use strict';

const net = require('net');
const os = require('os');
const readline = require('readline');
const crypto = require('crypto');
const { execFile } = require('child_process');

const PORT = 47831;
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = q => new Promise(resolve => terminal.question(q, resolve));
const PIN = String(crypto.randomInt(100000, 1000000));
const TOKEN = crypto.randomBytes(24).toString('hex');

function getIPv4() {
  const result = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const item of entries || []) {
      if ((item.family === 'IPv4' || item.family === 4) &&
          !item.internal && item.address) {
        result.push(item.address);
      }
    }
  }
  return [...new Set(result)];
}

function run(file, args) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { encoding: 'utf8', timeout: 15000 }, (error, stdout, stderr) => {
      if (error) return reject(new Error((stderr || error.message || 'Perintah gagal').trim()));
      resolve(stdout || '');
    });
  });
}

async function listApps() {
  const output = await run('/system/bin/pm', ['list', 'packages', '-3']);
  return [...new Set(output.split(/\r?\n/)
    .map(line => line.trim().replace(/^package:/, ''))
    .filter(pkg => /^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+$/.test(pkg)))].sort();
}

function send(socket, data) {
  if (!socket.destroyed) socket.write(JSON.stringify(data) + '\n');
}

let activeSocket = null;
let activeToken = null;

const server = net.createServer(socket => {
  if (activeSocket && !activeSocket.destroyed) {
    send(socket, { type: 'error', message: 'Receiver sedang digunakan Controller lain.' });
    socket.end();
    return;
  }

  socket.setEncoding('utf8');
  let buffer = '';
  let paired = false;
  let chain = Promise.resolve();

  console.log(YELLOW + '\n[CONNECTION] Ada Controller yang menghubungi.' + RESET);

  async function handle(data) {
    if (!paired) {
      if (data.type !== 'pair' || String(data.pin || '') !== PIN) {
        send(socket, { type: 'error', message: 'PIN salah atau permintaan tidak valid.' });
        socket.end();
        return;
      }

      console.log(YELLOW + '\nPERMINTAAN PAIRING' + RESET);
      console.log('Controller meminta izin mengakses daftar aplikasi dan membuka aplikasi.');
      const answer = (await ask('Izinkan koneksi? (y/n): ')).trim().toLowerCase();

      if (answer !== 'y' && answer !== 'ya') {
        send(socket, { type: 'error', message: 'Koneksi ditolak oleh Receiver.' });
        socket.end();
        return;
      }

      paired = true;
      activeSocket = socket;
      activeToken = TOKEN;
      send(socket, { type: 'paired', token: TOKEN });
      console.log(GREEN + '[PAIRED] Controller terhubung.' + RESET);
      return;
    }

    if (data.token !== activeToken) {
      send(socket, { type: 'error', message: 'Token tidak valid.' });
      return;
    }

    if (data.type === 'list_apps') {
      try {
        const packages = await listApps();
        const apps = packages.map(pkg => ({ name: pkg, package: pkg }));
        send(socket, { type: 'apps', source: 'third-party', apps });
        console.log(GREEN + '[APPS] Mengirim ' + apps.length + ' aplikasi.' + RESET);
      } catch (error) {
        send(socket, { type: 'error', message: 'Gagal membaca aplikasi: ' + error.message });
      }
      return;
    }

    if (data.type === 'open_app') {
      const pkg = String(data.package || '');
      try {
        const packages = await listApps();
        if (!packages.includes(pkg)) {
          send(socket, { ok: false, message: 'Aplikasi tidak ditemukan dalam daftar aplikasi pengguna.' });
          return;
        }
        await run('/system/bin/monkey', ['-p', pkg, '1']);
        send(socket, { ok: true, message: 'Perintah membuka aplikasi dikirim: ' + pkg });
        console.log(GREEN + '[OPEN] ' + pkg + RESET);
      } catch (error) {
        send(socket, { ok: false, message: 'Gagal membuka aplikasi: ' + error.message });
      }
      return;
    }

    send(socket, { type: 'error', message: 'Perintah tidak dikenal.' });
  }

  socket.on('data', chunk => {
    buffer += chunk;
    let lines = [];
    while (buffer.includes('\n')) {
      const index = buffer.indexOf('\n');
      lines.push(buffer.slice(0, index));
      buffer = buffer.slice(index + 1);
    }
    for (const line of lines) {
      if (!line.trim()) continue;
      chain = chain.then(async () => {
        let data;
        try { data = JSON.parse(line); }
        catch {
          send(socket, { type: 'error', message: 'Format pesan tidak valid.' });
          return;
        }
        await handle(data);
      }).catch(error => {
        send(socket, { type: 'error', message: error.message });
      });
    }
  });

  socket.on('close', () => {
    if (activeSocket === socket) {
      activeSocket = null;
      activeToken = null;
    }
    console.log(YELLOW + '\n[DISCONNECTED] Controller terputus.' + RESET);
  });
  socket.on('error', error => console.log(RED + '[SOCKET] ' + error.message + RESET));
});

server.on('error', error => console.log(RED + '[SERVER] ' + error.message + RESET));

console.clear();
console.log(GREEN);
console.log('==============================================');
console.log('       RANGGACRYZHACK DUAL CONTROL');
console.log('                 RECEIVER V2');
console.log('==============================================');
console.log(RESET);

const ips = getIPv4();
console.log(GREEN + 'IP ADDRESS :' + RESET);
if (ips.length) ips.forEach(ip => console.log('  ' + ip));
else console.log(YELLOW + '  IP belum terdeteksi. Sambungkan Wi-Fi/hotspot.' + RESET);
console.log(GREEN + 'PORT       : ' + PORT + RESET);
console.log(GREEN + 'PAIRING PIN: ' + PIN + RESET);
console.log(YELLOW + '\nMasukkan IP dan PIN ini di HP Controller.' + RESET);
console.log(YELLOW + 'Menunggu koneksi dan persetujuan pairing...' + RESET);

server.listen(PORT, '0.0.0.0');

process.on('SIGINT', () => {
  console.log(YELLOW + '\nReceiver dihentikan.' + RESET);
  server.close();
  terminal.close();
  process.exit(0);
});
