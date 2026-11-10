#!/usr/bin/env node
'use strict';

// Dual Control controller — connects to the paired receiver over the same Wi-Fi/hotspot.

const net = require('net');
const readline = require('readline');

const PORT = 47831;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = q => new Promise(resolve => rl.question(q, resolve));

function request(socket, payload) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const onData = chunk => {
      buffer += chunk.toString();
      const i = buffer.indexOf('\n');
      if (i < 0) return;
      socket.off('data', onData);
      try { resolve(JSON.parse(buffer.slice(0, i))); }
      catch (e) { reject(new Error('Balasan receiver tidak valid.')); }
    };
    socket.on('data', onData);
    socket.write(JSON.stringify(payload) + '\n');
    setTimeout(() => {
      socket.off('data', onData);
      reject(new Error('Receiver tidak merespons.'));
    }, 15000).unref();
  });
}

async function main() {
  console.log('\n========================================');
  console.log(' RANGGACRYZHACK // DUAL CONTROL');
  console.log('========================================');
  const host = (await ask('IP HP Receiver: ')).trim();
  const pin = (await ask('PIN 6 digit: ')).trim();
  if (!/^\d{6}$/.test(pin)) throw new Error('PIN harus terdiri dari 6 angka.');

  const socket = net.createConnection({ host, port: PORT });
  socket.setEncoding('utf8');
  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('error', reject);
  });

  const paired = await request(socket, { action: 'pair', pin });
  if (!paired.ok) throw new Error(paired.error || 'Pairing gagal.');
  console.log('\n' + paired.message);

  let page = 0;
  let apps = [];
  const pageSize = 8;

  async function refresh() {
    const result = await request(socket, { action: 'list' });
    if (!result.ok) throw new Error(result.error || 'Gagal mengambil daftar aplikasi.');
    apps = result.apps || [];
    page = Math.max(0, Math.min(page, Math.ceil(apps.length / pageSize) - 1));
  }

  await refresh();
  while (true) {
    const pages = Math.max(1, Math.ceil(apps.length / pageSize));
    const start = page * pageSize;
    const visible = apps.slice(start, start + pageSize);

    console.log('\n------------- DAFTAR APLIKASI -------------');
    if (!apps.length) console.log('Tidak ada aplikasi pihak ketiga yang terdeteksi.');
    visible.forEach((pkg, i) => console.log(String(start + i + 1).padStart(2, '0') + '. ' + pkg));
    console.log('-------------------------------------------');
    console.log('n = halaman berikut | p = sebelumnya | r = refresh | 0 = keluar');
    const choice = (await ask('Pilih nomor aplikasi: ')).trim().toLowerCase();

    if (choice === '0') {
      try { await request(socket, { action: 'disconnect' }); } catch {}
      break;
    }
    if (choice === 'n') { page = (page + 1) % pages; continue; }
    if (choice === 'p') { page = (page - 1 + pages) % pages; continue; }
    if (choice === 'r') { await refresh(); continue; }

    const number = Number(choice);
    if (!Number.isInteger(number) || number < 1 || number > apps.length) {
      console.log('Nomor tidak valid.');
      continue;
    }
    const pkg = apps[number - 1];
    const confirm = (await ask('Buka ' + pkg + '? (y/N): ')).trim().toLowerCase();
    if (confirm !== 'y' && confirm !== 'ya') continue;
    const result = await request(socket, { action: 'launch', package: pkg });
    console.log(result.ok ? result.message : 'Gagal: ' + result.error);
  }

  socket.end();
  console.log('Sesi selesai.');
}

main().catch(err => {
  console.error('\nERROR: ' + err.message);
  process.exitCode = 1;
}).finally(() => rl.close());
