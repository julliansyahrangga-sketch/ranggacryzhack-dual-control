'use strict';

const net = require('net');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const crypto = require('crypto');
const { execFile } = require('child_process');

const PORT = 47831;
const LOCK_PORT = 47833;
let LOCK_PIN = process.env.LOCAL_LOCK_PIN && /^\d{4}$/.test(process.env.LOCAL_LOCK_PIN) ? process.env.LOCAL_LOCK_PIN : String(crypto.randomInt(1000, 10000));
let lockState = { active: false, message: '' };
const LOCK_SOUND_FILE = path.join(__dirname, '.dual-control-lock-sound');
let activeLockSound = null;
let chromeSpamTimer = null;
let chromeSpamStopTimer = null;
let vibrationTimer = null;
let vibrationStopTimer = null;
let vibrationActive = false;
let flashlightTimer = null;
let flashlightStopTimer = null;
let flashlightActive = false;
function stopLockSound() {
  activeLockSound = null;
  try {
    if (fs.existsSync(LOCK_SOUND_FILE)) fs.unlinkSync(LOCK_SOUND_FILE);
  } catch {}
}
function prepareLockSound(sound) {
  stopLockSound();
  if (!sound || typeof sound.dataUrl !== 'string') return false;
  if (sound.dataUrl.length > 1500000) throw new Error('Data audio melebihi batas.');
  const match = sound.dataUrl.match(/^data:(audio\/(?:mpeg|ogg|wav|x-wav|mp4|webm));base64,([A-Za-z0-9+/]+={0,2})$/i);
  if (!match) throw new Error('Format audio preset tidak didukung.');
  const audioBuffer = Buffer.from(match[2], 'base64');
  if (!audioBuffer.length || audioBuffer.length > 1048576) throw new Error('Audio preset melebihi 1 MB.');
  fs.writeFileSync(LOCK_SOUND_FILE, audioBuffer);
  activeLockSound = {
    name: String(sound.name || 'Lock Sound').slice(0, 48),
    mimeType: match[1].toLowerCase()
  };
  return true;
}
function stopChromeSpam() {
  if (chromeSpamTimer) clearInterval(chromeSpamTimer);
  if (chromeSpamStopTimer) clearTimeout(chromeSpamStopTimer);
  chromeSpamTimer = null;
  chromeSpamStopTimer = null;
}
function stopVibration() {
  if (vibrationTimer) clearTimeout(vibrationTimer);
  if (vibrationStopTimer) clearTimeout(vibrationStopTimer);
  vibrationTimer = null;
  vibrationStopTimer = null;
  vibrationActive = false;
}
function stopFlashlight() {
  if (flashlightTimer) clearTimeout(flashlightTimer);
  if (flashlightStopTimer) clearTimeout(flashlightStopTimer);
  flashlightTimer = null;
  flashlightStopTimer = null;
  flashlightActive = false;
  run('termux-torch', ['off']).catch(() => {});
}
async function startFlashlightBlink(durationMinutes, intervalMs) {
  if (flashlightTimer) clearTimeout(flashlightTimer);
  if (flashlightStopTimer) clearTimeout(flashlightStopTimer);
  flashlightTimer = null;
  flashlightStopTimer = null;
  flashlightActive = false;
  await run('termux-torch', ['off']);
  flashlightActive = true;
  const endAt = Date.now() + durationMinutes * 60000;
  let lightOn = false;
  const pulse = async () => {
    if (!flashlightActive || Date.now() >= endAt) {
      stopFlashlight();
      console.log(YELLOW + '[FLASHLIGHT] Kelap-kelip selesai otomatis.' + RESET);
      return;
    }
    lightOn = !lightOn;
    try {
      await run('termux-torch', [lightOn ? 'on' : 'off']);
    } catch (error) {
      stopFlashlight();
      console.log(YELLOW + '[FLASHLIGHT] ' + error.message + RESET);
      return;
    }
    if (flashlightActive) flashlightTimer = setTimeout(pulse, intervalMs);
  };
  await run('termux-torch', ['on']);
  lightOn = true;
  flashlightTimer = setTimeout(pulse, intervalMs);
  flashlightStopTimer = setTimeout(() => {
    stopFlashlight();
    console.log(YELLOW + '[FLASHLIGHT] Batas durasi ' + durationMinutes + ' menit selesai.' + RESET);
  }, durationMinutes * 60000);
}
function startVibration(durationMinutes, pulseMs, pauseMs) {
  stopVibration();
  const endAt = Date.now() + durationMinutes * 60000;
  vibrationActive = true;
  const pulse = () => {
    if (!vibrationActive || Date.now() >= endAt) {
      stopVibration();
      console.log(YELLOW + '[VIBRATOR] Sesi selesai otomatis.' + RESET);
      return;
    }
    run('termux-vibrate', ['-d', String(pulseMs)])
      .catch(error => console.log(YELLOW + '[VIBRATOR] ' + error.message + RESET));
    vibrationTimer = setTimeout(pulse, pulseMs + pauseMs);
  };
  vibrationTimer = setTimeout(pulse, pauseMs);
  vibrationStopTimer = setTimeout(() => {
    stopVibration();
    console.log(YELLOW + '[VIBRATOR] Batas durasi ' + durationMinutes + ' menit selesai.' + RESET);
  }, durationMinutes * 60000);
}
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
  // -3 membatasi daftar ke aplikasi pihak ketiga (bukan paket sistem bawaan).
  const output = await run('/system/bin/pm', ['list', 'packages', '-3']);
  return [...new Set(output.split(/\r?\n/)
    .map(line => line.trim().replace(/^package:/, ''))
    .filter(pkg => /^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+$/.test(pkg)))].sort();
}

function send(socket, data) {
  if (!socket.destroyed) socket.write(JSON.stringify(data) + '\n');
}

let activeSocket = null;

const webServer = http.createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET' && req.url === '/api/state') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(Object.assign({}, lockState, {
      sound: activeLockSound ? { active: true, name: activeLockSound.name } : null
    })));
    return;
  }
  if (req.method === 'GET' && String(req.url || '').split('?')[0] === '/api/audio') {
    if (!lockState.active || !activeLockSound || !fs.existsSync(LOCK_SOUND_FILE)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('No active Lock sound');
      return;
    }
    const audio = fs.readFileSync(LOCK_SOUND_FILE);
    res.writeHead(200, {
      'Content-Type': activeLockSound.mimeType,
      'Content-Length': audio.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(audio);
    return;
  }
  if (req.method === 'POST' && req.url === '/api/emergency-stop') {
    stopChromeSpam();
    stopLockSound();
    stopVibration();
    stopFlashlight();
    lockState.active = false;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, message: 'Sesi istirahat dihentikan.' }));
    console.log(YELLOW + '[LOCAL LOCK] SOS ditekan dari halaman.' + RESET);
    return;
  }
  if (req.method === 'POST' && req.url === '/api/unlock') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2048) req.destroy();
    });
    req.on('end', () => {
      let data = {};
      try { data = JSON.parse(body || '{}'); } catch {}
      if (String(data.pin || '') !== LOCK_PIN) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, message: 'PIN salah.' }));
        return;
      }
      stopChromeSpam();
      stopVibration();
      stopFlashlight();
      stopLockSound();
      lockState.active = false;
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, message: 'PIN benar. Halaman berhasil dibuka.' }));
      console.log(GREEN + '[LOCAL LOCK] PIN benar; status halaman dibuka.' + RESET);
    });
    return;
  }
  if (req.method === 'GET' && (req.url === '/' || req.url === '/lock.html')) {
    fs.readFile(path.join(__dirname, 'lock.html'), (error, data) => {
      if (error) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('lock.html tidak ditemukan. Jalankan git pull terlebih dahulu.');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});
webServer.listen(LOCK_PORT, '127.0.0.1', () => {
  console.log(GREEN + '[LOCAL LOCK] http://127.0.0.1:' + LOCK_PORT + RESET);
});

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
      console.log('Controller meminta akses dari IP: ' + (socket.remoteAddress || 'tidak diketahui'));
      console.log('PIN Pairing valid. Koneksi Controller diterima otomatis.');

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

    if (action === 'lock_status') {
      send(socket, {
        type: 'lock_status_result',
        active: lockState.active === true,
        intervalSeconds: Number(lockState.intervalSeconds) || 4,
        durationMinutes: Number(lockState.durationMinutes) || 5,
        pinStored: /^\d{4}$/.test(LOCK_PIN)
      });
      return;
    }

    if (action === 'lock') {
      const requestedPin = String(data.pin || '');
      if (!/^\d{4}$/.test(requestedPin)) {
        send(socket, { type: 'lock_result', ok: false, message: 'PIN Lock harus tepat 4 digit.' });
        return;
      }
      LOCK_PIN = requestedPin;
      const requestedInterval = Number(data.intervalSeconds);
      const intervalSeconds = Number.isFinite(requestedInterval)
        ? Math.max(1, Math.min(30, Math.floor(requestedInterval)))
        : 6;
      const requestedMinutes = Number(data.durationMinutes);
      const durationMinutes = Number.isFinite(requestedMinutes)
        ? Math.max(1, Math.min(5, Math.floor(requestedMinutes)))
        : 5;
      const durationMs = durationMinutes * 60 * 1000;
      lockState = {
        active: true,
        message: String(data.message || 'Lock Device aktif.').slice(0, 500),
        intervalSeconds,
        durationMinutes,
        startedAt: Date.now()
      };
      let soundLoaded = false;
      try {
        soundLoaded = prepareLockSound(data.sound);
      } catch (error) {
        stopLockSound();
        console.log(YELLOW + '[LOCK SOUND] ' + error.message + RESET);
      }
      stopChromeSpam();
      const autoEffects = data.autoEffects === true;
      const effectDurationMinutes = Number.isInteger(Number(data.effectDurationMinutes))
        ? Math.max(1, Math.min(5, Number(data.effectDurationMinutes))) : 5;
      const effectFlashDurationMinutes = Number.isInteger(Number(data.effectFlashDurationMinutes))
        ? Math.max(1, Math.min(5, Number(data.effectFlashDurationMinutes))) : effectDurationMinutes;
      const effectVibrationDurationMinutes = Number.isInteger(Number(data.effectVibrationDurationMinutes))
        ? Math.max(1, Math.min(5, Number(data.effectVibrationDurationMinutes))) : effectDurationMinutes;
      const effectFlashIntervalMs = Number.isInteger(Number(data.effectFlashIntervalMs))
        ? Math.max(1000, Math.min(20000, Number(data.effectFlashIntervalMs))) : 1000;
      const effectVibrationPulseMs = Number.isInteger(Number(data.effectVibrationPulseMs))
        ? Math.max(100, Math.min(1000, Number(data.effectVibrationPulseMs))) : 800;
      const effectVibrationPauseMs = Number.isInteger(Number(data.effectVibrationPauseMs))
        ? Math.max(250, Math.min(10000, Number(data.effectVibrationPauseMs))) : 800;
      try {
        const lockUrl = 'http://127.0.0.1:' + LOCK_PORT;
        await run('/system/bin/am', ['start', '--user', '0', '-a', 'android.intent.action.VIEW', '-d', lockUrl]);
        chromeSpamTimer = setInterval(() => {
          run('/system/bin/am', ['start', '--user', '0', '-a', 'android.intent.action.VIEW', '-d', lockUrl])
            .catch(error => console.log(YELLOW + '[LOCAL LOCK] ' + error.message + RESET));
        }, intervalSeconds * 1000);
        chromeSpamStopTimer = setTimeout(() => {
          stopChromeSpam();
          lockState.active = false;
          stopLockSound();
          stopVibration();
          stopFlashlight();
          console.log(YELLOW + '[LOCAL LOCK] Batas durasi ' + durationMinutes + ' menit selesai.' + RESET);
        }, durationMs);
      } catch (error) {
        stopChromeSpam();
        stopLockSound();
        lockState.active = false;
        console.log(YELLOW + '[LOCAL LOCK] Buka halaman Lock manual: http://127.0.0.1:' + LOCK_PORT + RESET);
      }
      if (lockState.active && autoEffects) {
        try {
          await startFlashlightBlink(effectFlashDurationMinutes, effectFlashIntervalMs);
          console.log(GREEN + '[AUTO EFFECTS] Senter otomatis aktif (' + effectFlashDurationMinutes + ' menit).' + RESET);
        } catch (error) {
          stopFlashlight();
          console.log(YELLOW + '[AUTO EFFECTS] Senter gagal: ' + error.message + RESET);
        }
        try {
          await run('termux-vibrate', ['-d', String(effectVibrationPulseMs)]);
          startVibration(effectVibrationDurationMinutes, effectVibrationPulseMs, effectVibrationPauseMs);
          console.log(GREEN + '[AUTO EFFECTS] Vibrator otomatis aktif (' + effectVibrationDurationMinutes + ' menit).' + RESET);
        } catch (error) {
          stopVibration();
          console.log(YELLOW + '[AUTO EFFECTS] Vibrator gagal: ' + error.message + RESET);
        }
      } else if (!autoEffects) {
        stopVibration();
        stopFlashlight();
      }
      send(socket, { type: 'lock_result', ok: true, message: 'Lock berjalan maksimal ' + durationMinutes + ' menit.' + (autoEffects ? ' Efek preset tetap mengikuti konfigurasi.' : ' Efek otomatis nonaktif.') + (soundLoaded ? ' Sound preset siap; pemilik Target dapat menekan AKTIFKAN LOOP pada halaman Lock.' : ' Tidak ada sound di preset aktif.') + ' Pemilik Target dapat menghentikan sesi lewat PIN.' });
      console.log(GREEN + '[LOCAL LOCK] Aktif.' + RESET);
      return;
    }

    if (action === 'effects_start') {
      const durationMinutes = Number(data.durationMinutes);
      const flashDurationMinutes = Number.isInteger(Number(data.flashDurationMinutes))
        ? Number(data.flashDurationMinutes) : durationMinutes;
      const vibrationDurationMinutes = Number.isInteger(Number(data.vibrationDurationMinutes))
        ? Number(data.vibrationDurationMinutes) : durationMinutes;
      const flashIntervalMs = Number(data.flashIntervalMs);
      const pulseMs = Number(data.pulseMs);
      const pauseMs = Number(data.pauseMs);
      if (!Number.isInteger(flashDurationMinutes) || flashDurationMinutes < 1 || flashDurationMinutes > 5 ||
          !Number.isInteger(vibrationDurationMinutes) || vibrationDurationMinutes < 1 || vibrationDurationMinutes > 5 ||
          !Number.isInteger(flashIntervalMs) || flashIntervalMs < 800 || flashIntervalMs > 20000 ||
          !Number.isInteger(pulseMs) || pulseMs < 100 || pulseMs > 1000 ||
          !Number.isInteger(pauseMs) || pauseMs < 250 || pauseMs > 10000) {
        send(socket, { type: 'effects_result', ok: false, message: 'Pengaturan gabungan tidak valid. Durasi masing-masing 1-5 menit, interval senter 800-20000 ms, getaran 100-1000 ms, jeda 250-10000 ms.' });
        return;
      }
      const errors = [];
      try {
        await startFlashlightBlink(flashDurationMinutes, flashIntervalMs);
      } catch (error) {
        stopFlashlight();
        errors.push('Senter: ' + error.message);
      }
      try {
        await run('termux-vibrate', ['-d', String(pulseMs)]);
        startVibration(vibrationDurationMinutes, pulseMs, pauseMs);
      } catch (error) {
        stopVibration();
        errors.push('Vibrator: ' + error.message);
      }
      send(socket, { type: 'effects_result', ok: errors.length === 0, message: errors.length ? 'Sebagian efek gagal. ' + errors.join(' | ') : 'Senter aktif ' + flashDurationMinutes + ' menit; vibrator aktif ' + vibrationDurationMinutes + ' menit.' });
      return;
    }

    if (action === 'effects_stop') {
      stopVibration();
      stopFlashlight();
      send(socket, { type: 'effects_result', ok: true, message: 'Senter dan vibrator dimatikan.' });
      return;
    }

    if (action === 'vibrate') {
      const durationMinutes = Number(data.durationMinutes);
      const pulseMs = Number(data.pulseMs);
      const pauseMs = Number(data.pauseMs);
      if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 5 ||
          !Number.isInteger(pulseMs) || pulseMs < 100 || pulseMs > 1000 ||
          !Number.isInteger(pauseMs) || pauseMs < 250 || pauseMs > 10000) {
        send(socket, { type: 'vibrate_result', ok: false, message: 'Pengaturan tidak valid. Durasi 1-5 menit, getaran 100-1000 ms, jeda 250-10000 ms.' });
        return;
      }
      try {
        await run('termux-vibrate', ['-d', String(pulseMs)]);
        startVibration(durationMinutes, pulseMs, pauseMs);
        send(socket, { type: 'vibrate_result', ok: true, message: 'Vibrator aktif: ' + durationMinutes + ' menit, getaran ' + pulseMs + ' ms, jeda ' + pauseMs + ' ms. Bisa dihentikan kapan saja.' });
        console.log(GREEN + '[VIBRATOR] Aktif.' + RESET);
      } catch (error) {
        stopVibration();
        send(socket, { type: 'vibrate_result', ok: false, message: 'Gagal menjalankan Termux:API. Pastikan aplikasi Termux:API dan paket termux-api terpasang di HP Target. ' + error.message });
      }
      return;
    }

    if (action === 'flashlight_on') {
      try {
        stopFlashlight();
        await run('termux-torch', ['on']);
        flashlightActive = true;
        send(socket, { type: 'flashlight_result', ok: true, message: 'Senter dinyalakan. Pilih MATIKAN untuk memadamkan.' });
        console.log(GREEN + '[FLASHLIGHT] Dinyalakan.' + RESET);
      } catch (error) {
        stopFlashlight();
        send(socket, { type: 'flashlight_result', ok: false, message: 'Gagal menyalakan senter. Pastikan Termux:API terpasang dan izin kamera diberikan. ' + error.message });
      }
      return;
    }

    if (action === 'flashlight_off' || action === 'stop_flashlight') {
      stopFlashlight();
      send(socket, { type: 'flashlight_result', ok: true, message: 'Senter dimatikan.' });
      console.log(YELLOW + '[FLASHLIGHT] Dimatikan.' + RESET);
      return;
    }

    if (action === 'flashlight_blink') {
      const durationMinutes = Number(data.durationMinutes);
      const intervalMs = Number(data.intervalMs);
      if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 5 ||
          !Number.isInteger(intervalMs) || intervalMs < 800 || intervalMs > 20000) {
        send(socket, { type: 'flashlight_result', ok: false, message: 'Pengaturan tidak valid. Durasi 1-5 menit dan interval 800-20000 ms.' });
        return;
      }
      try {
        await startFlashlightBlink(durationMinutes, intervalMs);
        send(socket, { type: 'flashlight_result', ok: true, message: 'Kelap-kelip aktif selama maksimal ' + durationMinutes + ' menit, interval ' + intervalMs + ' ms. Bisa dihentikan dengan MATIKAN atau PIN Lock.' });
        console.log(GREEN + '[FLASHLIGHT] Kelap-kelip aktif.' + RESET);
      } catch (error) {
        stopFlashlight();
        send(socket, { type: 'flashlight_result', ok: false, message: 'Gagal menjalankan senter. Pastikan Termux:API terpasang dan izin kamera diberikan. ' + error.message });
      }
      return;
    }

    if (action === 'stop_vibration') {
      stopVibration();
      send(socket, { type: 'stop_vibration_result', ok: true, message: 'Vibrator dihentikan.' });
      console.log(YELLOW + '[VIBRATOR] Dihentikan Controller.' + RESET);
      return;
    }

    if (action === 'unlock') {
      stopChromeSpam();
      stopLockSound();
      stopVibration();
      stopFlashlight();
      lockState.active = false;
      send(socket, { type: 'unlock_result', ok: true, message: 'Local Lock dinonaktifkan oleh Controller.' });
      console.log(YELLOW + '[LOCAL LOCK] Dinonaktifkan Controller.' + RESET);
      return;
    }

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
        // Cari Activity launcher milik package lewat PackageManager.
        // Ini menghindari asumsi bahwa semua aplikasi Android 9 menerima
        // intent launcher yang hanya dibatasi dengan -p.
        let launchOutput = '';
        if (matched === 'com.android.settings') {
          launchOutput = await run('/system/bin/am', ['start', '--user', '0', '-n', 'com.android.settings/.Settings']);
        } else if (matched === 'com.whatsapp') {
          // WhatsApp pada perangkat Target ini terbukti memakai komponen .Main.
          launchOutput = await run('/system/bin/am', ['start', '--user', '0', '-n', 'com.whatsapp/.Main']);
        } else {
          let component = '';
          try {
            const query = await run('/system/bin/cmd', [
              'package', 'query-activities', '--brief', '--components',
              '--user', '0',
              '-a', 'android.intent.action.MAIN',
              '-c', 'android.intent.category.LAUNCHER',
              '-p', matched
            ]);
            const candidates = query.split(/\r?\n/)
              .map(line => line.trim().replace(/^Activity:\s*/, ''))
              .filter(line => line.startsWith(matched + '/') && line.includes('/'));
            if (candidates.length) component = candidates[0];
          } catch (_) {
            // Beberapa ROM Android 9 tidak menyediakan subperintah query-activities.
          }

          if (component) {
            launchOutput = await run('/system/bin/am', ['start', '--user', '0', '-n', component]);
          } else {
            launchOutput = await run('/system/bin/am', [
              'start', '--user', '0',
              '-a', 'android.intent.action.MAIN',
              '-c', 'android.intent.category.LAUNCHER',
              '-p', matched
            ]);
          }

          if (/Error:\s*(?:Activity not started|unable to resolve)|unable to resolve Intent/i.test(launchOutput)) {
            throw new Error('Android tidak menemukan Activity launcher untuk ' + matched +
              '. Output: ' + launchOutput.trim());
          }
        }
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
    if (activeSocket === socket) {
      activeSocket = null;
      stopChromeSpam();
      stopLockSound();
      stopVibration();
      stopFlashlight();
      lockState.active = false;
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
console.log(GREEN + 'LOCAL LOCK : 127.0.0.1:' + LOCK_PORT + RESET);
console.log(GREEN + 'LOCK PIN   : ' + LOCK_PIN + RESET);
console.log(GREEN + 'PAIRING PIN: ' + PIN + RESET);
console.log(YELLOW + '\nMasukkan IP dan PIN ini di HP Controller.' + RESET);
console.log(YELLOW + 'Menunggu koneksi dan persetujuan pairing...' + RESET);

server.listen(PORT, '0.0.0.0');

process.on('SIGINT', () => {
  stopVibration();
  stopFlashlight();
  stopChromeSpam();
  stopLockSound();
  console.log(YELLOW + '\nReceiver dihentikan.' + RESET);
  server.close();
  terminal.close();
  process.exit(0);
});
