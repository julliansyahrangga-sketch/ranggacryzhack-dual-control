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

const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = q => new Promise(resolve => terminal.question(q, resolve));
const PIN = String(crypto.randomInt(100000, 1000000));

function getIPv4() {
  const ips = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const item of entries || []) {
      if ((item.family === 'IPv4' || item.family === 4) && !item.internal && item.address) {
        ips.push(item.address);
      }
    }
  }
  return [...new Set(ips)];
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
  const output = await run('/system/bin/pm', ['list', 'packages']);
  return [...new Set(output.split(/\r?\n/)
    .map(line => line.trim().replace(/^package:/, ''))
    .filter(pkg => /^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+$/.test(pkg)))].sort();
}

function send(socket, data) {
  if (!socket.destroyed) socket.write(JSON.stringify(data) + '\n');
}

let activeSocket = null;

const server = net.createServer(socket => {
  if (activeSocket && !activeSocket.destroyed) {
    send(socket, { type: 'error', ok: false, message: 'Receiver sedang digunakan Controller lain.', error: 'Receiver sedang digunakan Controller lain.' });
    socket.end();
    return;
  }

  socket.setEncoding('utf8');
  let buffer = '';
  let paired = false;
  let token = '';
  let protocol = '';
  let chain = Promise.resolve();

  console.log(YELLOW + '\n[CONNECTION] Ada Controller yang menghubungi.' + RESET);

  async function handle(data) {
    const isLegacy = data && typeof data.action === 'string';
    const isV2 = data && typeof data.type === 'string';

    if (!paired) {
      const validPair = (isV2 && data.type === 'pair' && String(data.pin || '') === PIN) ||
                        (isLegacy && data.action === 'pair' && String(data.pin || '') === PIN);

      if (!validPair) {
        send(socket, isLegacy
          ? { ok: false, error: 'PIN salah atau permintaan pairing tidak valid.' }
          : { type: 'error', message: 'PIN salah atau permintaan pairing tidak valid.' });
        socket.end();
        return;
      }

      protocol = isLegacy ? 'legacy' : 'v2';
      console.log(YELLOW + '\nPERMINTAAN PAIRING' + RESET);
      console.log('Controller meminta izin menampilkan daftar aplikasi dan membuka aplikasi.');
      const answer = (await ask('Izinkan koneksi? (y/n): ')).trim().toLowerCase();

      if (answer !== 'y' && answer !== 'ya') {
        send(socket, protocol === 'legacy'
          ? { ok: false, error: 'Permintaan pairing ditolak di Receiver.' }
          : { type: 'error', message: 'Permintaan pairing ditolak di Receiver.' });
        socket.end();
        return;
      }

      paired = true;
      activeSocket = socket;

      if (protocol === 'legacy') {
        send(socket, { ok: true, message: 'Pairing disetujui.' });
      } else {
        token = crypto.randomBytes(24).toString('hex');
        send(socket, { type: 'paired', token });
      }

      console.log(GREEN + '[PAIRED] Controller terhubung.' + RESET);
      return;
    }

    if (protocol === 'v2' && data.token !== token) {
      send(socket, { type: 'error', message: 'Token tidak valid.' });
      return;
    }

    const action = protocol === 'legacy'
      ? data.action
      : data.type === 'list_apps' ? 'list'
      : data.type === 'open_app' ? 'launch'
      : data.type;

    if (action === 'list' || action === 'list_apps') {
      try {
        const apps = await listApps();
        if (protocol === 'legacy') {
          send(socket, { ok: true, apps });
        } else {
          send(socket, { type: 'apps', source: 'third-party', apps: apps.map(pkg => ({ name: pkg, package: pkg })) });
        }
        console.log(GREEN + '[APPS] Mengirim ' + apps.length + ' aplikasi.' + RESET);
      } catch (error) {
        send(socket, protocol === 'legacy'
          ? { ok: false, error: 'Gagal membaca aplikasi: ' + error.message }
          : { type: 'error', message: 'Gagal membaca aplikasi: ' + error.message });
      }
      return;
    }

    if (action === 'launch' || action === 'open_app') {
      const pkg = String(data.package || '');
      try {
        // Gunakan daftar package yang sama dengan yang baru saja dikirim ke Controller.
        // Hindari pemanggilan pm list packages kedua yang dapat menghasilkan daftar berbeda.
        const apps = await listApps();
        const matched = apps.find(name => name.toLowerCase() === pkg.toLowerCase());
        if (!matched) {
          throw new Error('Package tidak ditemukan pada daftar aplikasi Receiver: ' + pkg);
        }
        const resolved = await run('/system/bin/cmd', ['package', 'resolve-activity', '--brief', '--user', '0', '-a', 'android.intent.action.MAIN', '-c', 'android.intent.category.LAUNCHER', '-p', matched]);
        const component = resolved.split(/\r?\n/).map(line => line.trim()).filter(line => line.includes('/')).pop();
        if (!component) {
          throw new Error('Aktivitas launcher tidak ditemukan untuk package: ' + matched);
        }
        await run('/system/bin/cmd', ['activity', 'start-activity', '--user', '0', '-n', component]);
        const message = 'Perintah membuka aplikasi dikirim: ' + pkg;
        send(socket, protocol === 'legacy' ? { ok: true, message } : { ok: true, message });
        console.log(GREEN + '[OPEN] ' + pkg + RESET);
      } catch (error) {
        const message = 'Gagal membuka aplikasi: ' + error.message;
        send(socket, protocol === 'legacy' ? { ok: false, error: message } : { ok: false, message });
      }
      return;
    }

    if (action === 'disconnect') {
      send(socket, protocol === 'legacy'
        ? { ok: true, message: 'Terputus.' }
        : { type: 'disconnected', ok: true, message: 'Terputus.' });
      socket.end();
      return;
    }

    send(socket, protocol === 'legacy'
      ? { ok: false, error: 'Aksi tidak dikenal.' }
      : { type: 'error', message: 'Perintah tidak dikenal.' });
  }

  socket.on('data', chunk => {
    buffer += chunk;
    const lines = [];
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
          send(socket, { type: 'error', ok: false, message: 'Format pesan tidak valid.', error: 'Format pesan tidak valid.' });
          return;
        }
        await handle(data);
      }).catch(error => {
        send(socket, { type: 'error', ok: false, message: error.message, error: error.message });
      });
    }
  });

  socket.on('close', () => {
    if (activeSocket === socket) activeSocket = null;
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
