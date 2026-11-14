'use strict';

const net = require('net');
const dgram = require('dgram');
const os = require('os');
const fs = require('fs');
const path = require('path');
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

const CONFIG_FILE = path.join(__dirname, 'configurations.json');

function loadConfigStore() {
  const fallback = { autoEffects: true, activeConfigId: null, configs: [] };
  try {
    const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    if (!parsed || !Array.isArray(parsed.configs)) return fallback;
    const configs = parsed.configs.filter(item =>
      item && typeof item.id === 'string' && typeof item.name === 'string' &&
      Number.isInteger(item.vibrationPulseMs) && item.vibrationPulseMs >= 100 && item.vibrationPulseMs <= 1000 &&
      Number.isInteger(item.vibrationDurationMinutes) && item.vibrationDurationMinutes >= 1 && item.vibrationDurationMinutes <= 5 &&
      Number.isInteger(item.flashIntervalMs) && item.flashIntervalMs >= 800 && item.flashIntervalMs <= 20000 &&
      Number.isInteger(item.flashDurationMinutes) && item.flashDurationMinutes >= 1 && item.flashDurationMinutes <= 5
    );
    return {
      autoEffects: parsed.autoEffects !== false,
      activeConfigId: configs.some(item => item.id === parsed.activeConfigId) ? parsed.activeConfigId : null,
      configs
    };
  } catch {
    return fallback;
  }
}

let configStore = loadConfigStore();

function saveConfigStore() {
  const tempFile = CONFIG_FILE + '.tmp';
  fs.writeFileSync(tempFile, JSON.stringify(configStore, null, 2) + '\n', 'utf8');
  fs.renameSync(tempFile, CONFIG_FILE);
}

function getActiveConfig() {
  return configStore.configs.find(item => item.id === configStore.activeConfigId) || null;
}

async function askConfigNumber(label, min, max, current) {
  const raw = (await ask(label + ' [' + current + ']: ')).trim();
  if (!raw) return current;
  const value = Number(raw);
  if (!/^\\d+$/.test(raw) || value < min || value > max) {
    console.log(RED + 'Nilai harus ' + min + ' sampai ' + max + '.' + RESET);
    return null;
  }
  return value;
}

async function readConfigFields(existing = null) {
  const nameInput = (await ask('Nama config' + (existing ? ' [' + existing.name + ']' : '') + ': ')).trim();
  const name = (nameInput || (existing && existing.name) || '').slice(0, 32);
  if (!name) {
    console.log(RED + 'Nama config tidak boleh kosong.' + RESET);
    return null;
  }

  console.log('\n[ VIBRATOR ]');
  const vibrationPulseMs = await askConfigNumber(
    'Interval/pulsa getar (100-1000 ms)', 100, 1000,
    existing ? existing.vibrationPulseMs : 800
  );
  if (vibrationPulseMs === null) return null;
  const vibrationDurationMinutes = await askConfigNumber(
    'Durasi vibrator (1-5 menit)', 1, 5,
    existing ? existing.vibrationDurationMinutes : 5
  );
  if (vibrationDurationMinutes === null) return null;

  console.log('\n[ FLASHLIGHT ]');
  const flashIntervalMs = await askConfigNumber(
    'Interval kelap-kelip senter (800-20000 ms)', 800, 20000,
    existing ? existing.flashIntervalMs : 1000
  );
  if (flashIntervalMs === null) return null;
  const flashDurationMinutes = await askConfigNumber(
    'Durasi senter (1-5 menit)', 1, 5,
    existing ? existing.flashDurationMinutes : 5
  );
  if (flashDurationMinutes === null) return null;

  return {
    id: existing ? existing.id : Date.now().toString(36) + '-' + (configStore.configs.length + 1),
    name,
    vibrationPulseMs,
    vibrationDurationMinutes,
    flashIntervalMs,
    flashDurationMinutes
  };
}

function renderConfigList() {
  if (!configStore.configs.length) {
    console.log(YELLOW + 'Belum ada konfigurasi tersimpan.' + RESET);
    return;
  }
  configStore.configs.forEach((item, index) => {
    const active = item.id === configStore.activeConfigId ? '  < AKTIF' : '';
    console.log('[' + (index + 1) + '] ' + item.name + active);
    console.log('    Getar: ' + item.vibrationPulseMs + ' ms / ' + item.vibrationDurationMinutes + ' menit');
    console.log('    Senter: ' + item.flashIntervalMs + ' ms / ' + item.flashDurationMinutes + ' menit');
  });
}

async function chooseConfigIndex(promptText) {
  renderConfigList();
  if (!configStore.configs.length) return -1;
  const raw = (await ask(promptText)).trim();
  if (!/^\\d+$/.test(raw)) return -1;
  const index = Number(raw) - 1;
  return index >= 0 && index < configStore.configs.length ? index : -1;
}

async function configurationMenu() {
  while (true) {
    const active = getActiveConfig();
    banner();
    console.log(GREEN + '========================================' + RESET);
    console.log(GREEN + '              CONFIGURATION' + RESET);
    console.log(GREEN + '========================================' + RESET);
    console.log('AUTO EFFECTS : ' + (configStore.autoEffects ? 'ON' : 'OFF'));
    console.log('CONFIG AKTIF: ' + (active ? active.name : 'BELUM DIPILIH'));
    console.log('');
    console.log('[1] TAMBAH CONFIG');
    console.log('[2] EDIT CONFIG');
    console.log('[3] PILIH CONFIG AKTIF');
    console.log('[4] AUTO EFFECTS ON / OFF');
    console.log('[0] KEMBALI');
    const choice = (await ask('CONFIGURATION > ')).trim();

    if (choice === '0') return;

    if (choice === '1') {
      const item = await readConfigFields();
      if (!item) {
        await ask('Enter untuk kembali...');
        continue;
      }
      configStore.configs.push(item);
      if (!configStore.activeConfigId) configStore.activeConfigId = item.id;
      saveConfigStore();
      console.log(GREEN + 'Config "' + item.name + '" berhasil disimpan.' + RESET);
      await ask('Enter untuk kembali...');
      continue;
    }

    if (choice === '2') {
      const index = await chooseConfigIndex('Pilih nomor config yang akan diedit: ');
      if (index < 0) {
        console.log(YELLOW + 'Pilihan config tidak valid.' + RESET);
        await ask('Enter untuk kembali...');
        continue;
      }
      const updated = await readConfigFields(configStore.configs[index]);
      if (!updated) {
        await ask('Enter untuk kembali...');
        continue;
      }
      configStore.configs[index] = updated;
      saveConfigStore();
      console.log(GREEN + 'Config berhasil diperbarui.' + RESET);
      await ask('Enter untuk kembali...');
      continue;
    }

    if (choice === '3') {
      const index = await chooseConfigIndex('Pilih config aktif: ');
      if (index < 0) {
        console.log(YELLOW + 'Pilihan config tidak valid.' + RESET);
        await ask('Enter untuk kembali...');
        continue;
      }
      configStore.activeConfigId = configStore.configs[index].id;
      saveConfigStore();
      console.log(GREEN + 'Config aktif: ' + configStore.configs[index].name + RESET);
      await ask('Enter untuk kembali...');
      continue;
    }

    if (choice === '4') {
      configStore.autoEffects = !configStore.autoEffects;
      saveConfigStore();
      console.log('AUTO EFFECTS: ' + (configStore.autoEffects ? 'ON' : 'OFF'));
      await ask('Enter untuk kembali...');
      continue;
    }

    console.log('Pilihan tidak valid.');
    await ask('Enter...');
  }
}

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
      console.log('[3] CONFIGURATION');
      console.log('[0] DISCONNECT');
      const feature = (await ask('PILIH FITUR > ')).trim();

      if (feature === '0') break;

      if (feature === '3') {
        await configurationMenu();
        continue;
      }

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
        const rawInterval = (await ask('Interval buka ulang Chrome (1-30 detik): ')).trim();
        const intervalSeconds = Number(rawInterval);
        if (!/^\d+$/.test(rawInterval) || intervalSeconds < 1 || intervalSeconds > 30) {
          console.log(RED + 'Interval harus 1 sampai 30 detik.' + RESET);
          await ask('Enter untuk kembali...');
          continue;
        }
        const rawDuration = (await ask('Batas durasi sesi (1-5 menit): ')).trim();
        const durationMinutes = Number(rawDuration);
        if (!/^\d+$/.test(rawDuration) || durationMinutes < 1 || durationMinutes > 5) {
          console.log(RED + 'Durasi sesi harus 1 sampai 5 menit.' + RESET);
          await ask('Enter untuk kembali...');
          continue;
        }

        let lockActive = false;
        async function setLock() {
          const result = await channel.request({
            type: 'lock', token, message, pin: newPin, intervalSeconds, durationMinutes,
            autoEffects: configStore.autoEffects && !!getActiveConfig(),
            effectDurationMinutes: getActiveConfig() ? Math.max(getActiveConfig().flashDurationMinutes, getActiveConfig().vibrationDurationMinutes) : 5,
            effectFlashDurationMinutes: getActiveConfig() ? getActiveConfig().flashDurationMinutes : 5,
            effectVibrationDurationMinutes: getActiveConfig() ? getActiveConfig().vibrationDurationMinutes : 5,
            effectFlashIntervalMs: getActiveConfig() ? getActiveConfig().flashIntervalMs : 1000,
            effectVibrationPulseMs: getActiveConfig() ? getActiveConfig().vibrationPulseMs : 800,
            effectVibrationPauseMs: 800
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
          console.log('INTERVAL : ' + intervalSeconds + ' detik\nDURASI  : ' + durationMinutes + ' menit');
          console.log('');
          console.log('[1] LOCK');
          console.log('[2] UNLOCK');
          console.log('[3] VIBRATOR');
          console.log('[4] STOP VIBRATOR');
          console.log('[5] FLASHLIGHT');
          console.log('[6] NYALAKAN SENTER + VIBRATOR');
          console.log('[7] MATIKAN SENTER + VIBRATOR');
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
          if (lockChoice === '3') {
            const rawVibrationMinutes = (await ask('Durasi vibrator (1-5 menit): ')).trim();
            const vibrationMinutes = Number(rawVibrationMinutes);
            if (!/^\d+$/.test(rawVibrationMinutes) || vibrationMinutes < 1 || vibrationMinutes > 5) {
              console.log(RED + 'Durasi harus 1 sampai 5 menit.' + RESET);
              await ask('Enter...');
              continue;
            }
            const rawPulseMs = (await ask('Lama getaran tiap pulsa (100-1000 ms): ')).trim();
            const pulseMs = Number(rawPulseMs);
            if (!/^\d+$/.test(rawPulseMs) || pulseMs < 100 || pulseMs > 1000) {
              console.log(RED + 'Lama getaran harus 100 sampai 1000 ms.' + RESET);
              await ask('Enter...');
              continue;
            }
            const rawPauseMs = (await ask('Jeda antar-getaran (250-10000 ms): ')).trim();
            const pauseMs = Number(rawPauseMs);
            if (!/^\d+$/.test(rawPauseMs) || pauseMs < 250 || pauseMs > 10000) {
              console.log(RED + 'Jeda harus 250 sampai 10000 ms.' + RESET);
              await ask('Enter...');
              continue;
            }
            try {
              const result = await channel.request({
                type: 'vibrate', token, durationMinutes: vibrationMinutes, pulseMs, pauseMs
              }, 20000);
              console.log(result.ok ? GREEN + result.message + RESET : RED + result.message + RESET);
            } catch (e) {
              console.log(RED + e.message + RESET);
            }
            await ask('Enter untuk kembali...');
            continue;
          }
          if (lockChoice === '4') {
            try {
              const result = await channel.request({ type: 'stop_vibration', token });
              console.log(result.ok ? GREEN + result.message + RESET : RED + result.message + RESET);
            } catch (e) {
              console.log(RED + e.message + RESET);
            }
            await ask('Enter untuk kembali...');
            continue;
          }
          if (lockChoice === '6') {
            try {
              const active = getActiveConfig();
              if (!active) {
                console.log(YELLOW + 'Buat dan pilih CONFIG terlebih dahulu.' + RESET);
                await ask('Enter untuk kembali...');
                continue;
              }
              const result = await channel.request({
                type: 'effects_start', token,
                durationMinutes: Math.max(active.flashDurationMinutes, active.vibrationDurationMinutes),
                flashDurationMinutes: active.flashDurationMinutes,
                vibrationDurationMinutes: active.vibrationDurationMinutes,
                flashIntervalMs: active.flashIntervalMs,
                pulseMs: active.vibrationPulseMs,
                pauseMs: 800
              }, 20000);
              console.log(result.ok ? GREEN + result.message + RESET : RED + result.message + RESET);
            } catch (e) { console.log(RED + e.message + RESET); }
            await ask('Enter untuk kembali...');
            continue;
          }
          if (lockChoice === '7') {
            try {
              const result = await channel.request({ type: 'effects_stop', token });
              console.log(result.ok ? GREEN + result.message + RESET : RED + result.message + RESET);
            } catch (e) { console.log(RED + e.message + RESET); }
            await ask('Enter untuk kembali...');
            continue;
          }
          if (lockChoice === '5') {
            console.log('\n[ FLASHLIGHT ]');
            console.log('[a] AKTIFKAN');
            console.log('[b] MATIKAN');
            console.log('[c] KELAP-KELIP');
            console.log('[0] KEMBALI');
            const flashlightChoice = (await ask('FLASHLIGHT > ')).trim().toLowerCase();
            if (flashlightChoice === '0') continue;
            try {
              let request;
              if (flashlightChoice === 'a') {
                request = { type: 'flashlight_on', token };
              } else if (flashlightChoice === 'b') {
                request = { type: 'flashlight_off', token };
              } else if (flashlightChoice === 'c') {
                const rawFlashMinutes = (await ask('Durasi kelap-kelip (1-5 menit): ')).trim();
                const flashMinutes = Number(rawFlashMinutes);
                if (!/^\d+$/.test(rawFlashMinutes) || flashMinutes < 1 || flashMinutes > 5) {
                  console.log(RED + 'Durasi harus 1 sampai 5 menit.' + RESET);
                  await ask('Enter...');
                  continue;
                }
                const rawFlashInterval = (await ask('Interval kedip (800-20000 ms): ')).trim();
                const flashInterval = Number(rawFlashInterval);
                if (!/^\d+$/.test(rawFlashInterval) || flashInterval < 800 || flashInterval > 20000) {
                  console.log(RED + 'Interval harus 800 sampai 20000 ms.' + RESET);
                  await ask('Enter...');
                  continue;
                }
                request = {
                  type: 'flashlight_blink', token,
                  durationMinutes: flashMinutes, intervalMs: flashInterval
                };
              } else {
                console.log('Pilihan tidak valid.');
                await ask('Enter...');
                continue;
              }
              const result = await channel.request(request, 20000);
              console.log(result.ok ? GREEN + result.message + RESET : RED + result.message + RESET);
            } catch (e) {
              console.log(RED + e.message + RESET);
            }
            await ask('Enter untuk kembali...');
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