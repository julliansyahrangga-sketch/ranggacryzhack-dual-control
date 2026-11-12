'use strict';

const net = require('net');
const dgram = require('dgram');
const os = require('os');
const readline = require('readline');

const PORT = 47831;
const DISCOVERY_PORT = 47832;
const GREEN = '\x1b[32m';
const CYAN = GREEN;
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

const WIDTH = Math.max(30, Math.min(68, (process.stdout.columns || 80) - 2));
const PAGE_SIZE = 8;

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = q => new Promise(resolve =>
  terminal.question(q, resolve)
);

function banner() {
  console.clear();

  console.log(GREEN);
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║          RANGGACRYZHACK DUAL CONTROL             ║');
  console.log('║                  APP LAUNCHER V2                 ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(RESET);
}

function connectTo(host, port = PORT) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host,
      port
    });

    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error('Koneksi timeout.'));
    }, 10000);

    socket.once('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });

    socket.once('error', e => {
      clearTimeout(timer);
      reject(e);
    });
  });
}

async function discoverReceivers() {
  return new Promise(resolve => {
    const udp = dgram.createSocket('udp4');
    const found = new Map();
    let finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      try { udp.close(); } catch {}
      resolve([...found.values()]);
    }

    udp.on('message', (buffer, remote) => {
      try {
        const data = JSON.parse(buffer.toString());

        if (
          data.type !== 'DUAL_FOUND_V1' ||
          !/^\d{6}$/.test(String(data.pin)) ||
          Number(data.port) !== PORT
        ) return;

        found.set(remote.address, {
          host: remote.address,
          pin: String(data.pin),
          port: Number(data.port)
        });
      } catch {}
    });

    udp.on('error', () => finish());

    udp.bind(0, '0.0.0.0', () => {
      try {
        udp.setBroadcast(true);

        const targets = new Set(['255.255.255.255']);

        function toNumber(ip) {
          return ip.split('.').reduce(
            (n, part) => ((n << 8) | Number(part)) >>> 0,
            0
          );
        }

        function toIP(n) {
          return [
            (n >>> 24) & 255,
            (n >>> 16) & 255,
            (n >>> 8) & 255,
            n & 255
          ].join('.');
        }

        for (const entries of Object.values(os.networkInterfaces())) {
          for (const item of entries || []) {
            if (
              item.family !== 'IPv4' &&
              item.family !== 4
            ) continue;

            if (!item.address || !item.netmask) continue;

            const ip = toNumber(item.address);
            const mask = toNumber(item.netmask);
            const broadcast = ((ip & mask) | (~mask >>> 0)) >>> 0;

            targets.add(toIP(broadcast));
          }
        }

        const packet = Buffer.from(JSON.stringify({
          type: 'DUAL_DISCOVERY_V1'
        }));

        for (const target of targets) {
          udp.send(packet, DISCOVERY_PORT, target, () => {});
        }
      } catch {
        finish();
      }
    });

    setTimeout(finish, 5000);
  });
}

function createChannel(socket) {
  socket.setEncoding('utf8');

  let buffer = '';
  const pending = [];
  let closed = false;

  function failAll(error) {
    closed = true;

    while (pending.length) {
      const item = pending.shift();
      clearTimeout(item.timer);
      item.reject(error);
    }
  }

  socket.on('data', chunk => {
    buffer += chunk;

    while (buffer.includes('\n')) {
      const index = buffer.indexOf('\n');
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);

      if (!line.trim()) continue;

      let data;

      try {
        data = JSON.parse(line);
      } catch {
        continue;
      }

      const item = pending.shift();

      if (item) {
        clearTimeout(item.timer);
        item.resolve(data);
      }
    }
  });

  socket.on('close', () =>
    failAll(new Error('Receiver terputus.'))
  );

  socket.on('error', e => failAll(e));

  return {
    request(data, timeout = 20000) {
      return new Promise((resolve, reject) => {
        if (closed || socket.destroyed) {
          reject(new Error('Koneksi tertutup.'));
          return;
        }

        const item = { resolve, reject, timer: null };

        item.timer = setTimeout(() => {
          const index = pending.indexOf(item);

          if (index >= 0) pending.splice(index, 1);

          reject(new Error('Receiver tidak merespons.'));
        }, timeout);

        pending.push(item);

        socket.write(JSON.stringify(data) + '\n', error => {
          if (!error) return;

          const index = pending.indexOf(item);

          if (index >= 0) pending.splice(index, 1);

          clearTimeout(item.timer);
          reject(error);
        });
      });
    }
  };
}

function clip(value, max) {
  value = String(value || '');

  return value.length > max
    ? value.slice(0, max - 1) + '…'
    : value;
}

function pad(value, width) {
  const s = clip(value, width);

  return s + ' '.repeat(
    Math.max(0, width - s.length)
  );
}

function makeCard(app, number) {
  const inside = WIDTH - 2;
  const top = '┌' + '─'.repeat(inside) + '┐';
  const bottom = '└' + '─'.repeat(inside) + '┘';

  return [
    top,
    '│' + pad('  [' + number + ']  ' + app.name, inside) + '│',
    '│' + pad('  ' + app.package, inside) + '│',
    bottom
  ];
}

function renderApps(apps, page, source) {
  const pages = Math.max(1, Math.ceil(apps.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const visible = apps.slice(start, start + PAGE_SIZE);

  console.log(GREEN);
  console.log('┌' + '─'.repeat(WIDTH - 2) + '┐');
  console.log('│' + pad('          APP LIBRARY', WIDTH - 2) + '│');
  console.log('└' + '─'.repeat(WIDTH - 2) + '┘');
  console.log(RESET);

  console.log(GREEN + ' TOTAL APPS : ' + apps.length + RESET);
  console.log(GREEN + ' PAGE       : ' + (page + 1) + '/' + pages + RESET);
  console.log(GREEN + ' SOURCE     : ' +
    (source === 'launcher' ? 'Launcher applications' : 'Third-party fallback') +
    RESET);
  console.log('');

  for (let i = 0; i < visible.length; i++) {
    const number = start + i + 1;
    const card = makeCard(visible[i], number);

    for (const line of card) {
      console.log(GREEN + line + RESET);
    }

    console.log('');
  }

  console.log(GREEN + 'Ketik nomor aplikasi untuk membuka.' + RESET);
  console.log(GREEN + '[n] Next   [p] Previous   [r] Refresh' + RESET);
  console.log(GREEN + '[b] Back to feature menu' + RESET);
}

async function session(mode) {
  banner();
  console.log(GREEN + '========================================' + RESET);
  console.log(GREEN + '          SAMBUNGKAN KE TARGET' + RESET);
  console.log(GREEN + '========================================' + RESET);
  const host = (await ask('IP TARGET : ')).trim();
  const rawPort = (await ask('PORT      : ')).trim();
  const port = Number(rawPort);
  const pin = (await ask('PIN PAIRING (6 DIGIT) : ')).trim();

  if (!host || !/^\d+$/.test(rawPort) || port < 1 || port > 65535 || !/^\d{6}$/.test(pin)) {
    throw new Error('IP, port, atau PIN tidak valid.');
  }
  console.log(GREEN + '\nMenghubungkan ke ' + host + ':' + port + RESET);

  const socket = await connectTo(host, port);
  const channel = createChannel(socket);

  try {
    console.log(YELLOW + '\nMenunggu persetujuan HP Target...' + RESET);

    const paired = await channel.request({
      type: 'pair',
      pin
    }, 65000);

    if (paired.type !== 'paired') {
      throw new Error(paired.message || 'Pairing gagal.');
    }

    const token = paired.token;

    console.log(GREEN + '[CONNECTED]' + RESET);

    let apps = [];
    let source = 'launcher';

    async function refresh() {
      const result = await channel.request({
        type: 'list_apps',
        token
      }, 30000);

      if (result.type === 'error') {
        throw new Error(result.message);
      }

      if (result.type !== 'apps') {
        throw new Error('Format daftar aplikasi tidak dikenal.');
      }

      apps = result.apps || [];
      source = result.source || 'launcher';
    }

    while (true) {
      banner();
      console.log(GREEN + '[CONNECTED] REMOTE DEVICE • ' + mode + RESET);
      console.log('');
      console.log(GREEN + '========================================' + RESET);
      console.log(GREEN + '              PILIH FITUR' + RESET);
      console.log(GREEN + '========================================' + RESET);
      console.log('[1] OPEN APP');
      console.log('[2] LOCK DEVICE');
      console.log('[0] DISCONNECT');
      const feature = (await ask('PILIH FITUR > ')).trim();

      if (feature === '0') break;

      if (feature === '1') {
        try {
          await refresh();
        } catch (e) {
          console.log(RED + e.message + RESET);
          await ask('Enter...');
          continue;
        }
        if (!apps.length) {
          console.log(YELLOW + 'Tidak ada aplikasi ditemukan.' + RESET);
          await ask('Enter untuk kembali...');
          continue;
        }
        let page = 0;
        while (true) {
          banner();
          console.log(GREEN + '[CONNECTED] REMOTE DEVICE • ' + mode + RESET);
          renderApps(apps, page, source);
          const choice = (await ask('\nOPEN APP > ')).trim().toLowerCase();

          if (choice === 'b' || choice === '0') break;
          if (choice === 'n') {
            page = Math.min(page + 1, Math.ceil(apps.length / PAGE_SIZE) - 1);
            continue;
          }
          if (choice === 'p') {
            page = Math.max(0, page - 1);
            continue;
          }
          if (choice === 'r') {
            try { await refresh(); page = 0; }
            catch (e) { console.log(RED + e.message + RESET); await ask('Enter...'); }
            continue;
          }
          if (!/^\d+$/.test(choice)) {
            console.log('Masukkan nomor aplikasi atau b untuk kembali.');
            await ask('Enter...');
            continue;
          }
          const number = Number(choice);
          if (number < 1 || number > apps.length) {
            console.log(RED + 'Nomor tidak tersedia.' + RESET);
            await ask('Enter...');
            continue;
          }
          const app = apps[number - 1];
          console.log('\nOPENING: ' + app.name);
          const result = await channel.request({ type: 'open_app', token, package: app.package });
          console.log(result.ok ? GREEN + '[OK] ' + RESET : RED + '[FAILED] ' + RESET);
          console.log(result.message || result.error || '');
          await ask('\nEnter untuk kembali ke daftar...');
        }
        continue;
      }

      if (feature === '2') {
        const message = (await ask('Pesan untuk Target (maks. 500 karakter): ')).slice(0, 500);
        const newPin = (await ask('PIN LOCK BARU (4 digit, berbeda dari PIN pairing): ')).trim();
        if (!/^\d{4}$/.test(newPin)) {
          console.log(RED + 'PIN Lock harus tepat 4 digit.' + RESET);
          await ask('Enter untuk kembali...');
          continue;
        }
        const rawDuration = (await ask('Durasi Lock (1-30 detik): ')).trim();
        const durationSeconds = Number(rawDuration);
        if (!/^\d+$/.test(rawDuration) || durationSeconds < 1 || durationSeconds > 30) {
          console.log(RED + 'Durasi harus 1 sampai 30 detik.' + RESET);
          await ask('Enter untuk kembali...');
          continue;
        }

        let lockActive = false;
        async function setLock() {
          const result = await channel.request({
            type: 'lock', token, message, pin: newPin, durationSeconds
          });
          if (!result.ok) throw new Error(result.message || 'Gagal mengaktifkan Lock Device.');
          lockActive = true;
          console.log(GREEN + result.message + RESET);
        }
        try {
          await setLock();
        } catch (e) {
          console.log(RED + e.message + RESET);
          await ask('Enter untuk kembali...');
          continue;
        }

        // Tetap berada di layar Lock Device setelah MULAI; status dan kontrol tidak
        // otomatis kembali ke menu utama.
        while (true) {
          banner();
          console.log(GREEN + '========================================' + RESET);
          console.log(GREEN + '               LOCK DEVICE' + RESET);
          console.log(GREEN + '========================================' + RESET);
          console.log('STATUS : ' + (lockActive ? GREEN + 'LOCK ACTIVE' : YELLOW + 'UNLOCKED') + RESET);
          console.log('PIN    : tersimpan untuk sesi Lock ini');
          console.log('DURASI : ' + durationSeconds + ' detik');
          console.log('');
          console.log('[1] LOCK');
          console.log('[2] UNLOCK');
          console.log('[0] KEMBALI');
          const lockChoice = (await ask('LOCK DEVICE > ')).trim();
          if (lockChoice === '0') break;
          if (lockChoice === '1') {
            try { await setLock(); }
            catch (e) { console.log(RED + e.message + RESET); await ask('Enter...'); }
            continue;
          }
          if (lockChoice === '2') {
            try {
              const result = await channel.request({ type: 'unlock', token });
              lockActive = false;
              console.log(result.ok ? GREEN + result.message + RESET : RED + result.message + RESET);
            } catch (e) { console.log(RED + e.message + RESET); }
            await ask('Enter untuk lanjut...');
            continue;
          }
          console.log('Pilihan tidak valid.');
          await ask('Enter...');
        }
        continue;
      }

      console.log('Pilihan tidak valid.');
      await ask('Enter...');
    }
  } finally {
    socket.end();
  }
}

async function main() {
  try {
    while (true) {
      banner();

      console.log(CYAN + '[ CONNECTION MODES ]' + RESET);
      console.log('┌────────────────────────────────────┐');
      console.log('│ [1] Bluetooth (belum tersedia)     │');
      console.log('│ [2] Same Wi-Fi                     │');
      console.log('│ [3] Hotspot                        │');
      console.log('│ [0] Exit                           │');
      console.log('└────────────────────────────────────┘');

      const mode = (await ask('\nSELECT MODE > ')).trim();

      if (mode === '0') break;

      if (mode === '1') {
        console.log(YELLOW +
          'Bluetooth belum tersedia pada versi ini.' +
          RESET);
        await ask('Enter...');
        continue;
      }

      if (mode !== '2' && mode !== '3') {
        console.log('Mode tidak valid.');
        await ask('Enter...');
        continue;
      }

      try {
        if (mode === '2') {
          console.log('\nGunakan Wi-Fi yang sama.');
        } else {
          console.log('\nGunakan hotspot HP Controller.');
        }

        await session(
          mode === '2' ? 'SAME WIFI' : 'HOTSPOT'
        );
      } catch (e) {
        console.log(RED + '\n[ERROR] ' + e.message + RESET);
      }

      await ask('\nEnter untuk menu utama...');
    }
  } finally {
    terminal.close();
    console.log('\nCONTROLLER CLOSED.');
  }
}

main().catch(e => {
  console.error('[FATAL]', e.message);
});