// 医疗设备铭牌识别 - OCR 服务守护进程
// 每 10 秒检查 server.js 是否在跑，死了自动重启
// 同时避免自己重复启动（互斥锁文件）

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const LOCK_FILE = path.join(__dirname, 'watchdog.lock');
const LOG_FILE = path.join(__dirname, 'watchdog.log');
const SERVER_JS = path.join(__dirname, 'server.js');
const NODE_EXE = process.execPath;
const PORT = 3000;
const CHECK_INTERVAL = 10000; // 10秒检查一次

// === 互斥锁：避免多个 watchdog 重复启动 server ===
function acquireLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const oldPid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8'), 10);
      // 检查那个进程是否还活着
      try {
        process.kill(oldPid, 0);
        console.log('⚠️ Watchdog 已在运行 (PID ' + oldPid + ')，本次启动退出');
        return false;
      } catch (e) {
        // 旧进程已死，删掉旧锁继续
        fs.unlinkSync(LOCK_FILE);
      }
    }
    fs.writeFileSync(LOCK_FILE, String(process.pid));
    return true;
  } catch (e) {
    return false;
  }
}

function releaseLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const lockPid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8'), 10);
      if (lockPid === process.pid) fs.unlinkSync(LOCK_FILE);
    }
  } catch (e) {}
}

function log(msg) {
  const line = '[' + new Date().toISOString().substr(11, 8) + '] ' + msg + '\n';
  fs.appendFileSync(LOG_FILE, line);
  process.stdout.write(line);
}

let serverProcess = null;
let restartCount = 0;
let lastRestartTime = 0;

function startServer() {
  // 先确保 3000 端口完全释放（避免 EADDRINUSE）
  try {
    require('child_process').execSync(
      'powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"',
      { timeout: 5000 }
    );
  } catch (e) {}
  log('启动 server.js...');
  serverProcess = spawn(NODE_EXE, [SERVER_JS], {
    cwd: __dirname,
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  serverProcess.stdout.on('data', d => log('[server] ' + d.toString().trim()));
  serverProcess.stderr.on('data', d => log('[server-err] ' + d.toString().trim()));
  serverProcess.on('exit', (code, signal) => {
    log('⚠️ server.js 退出 (code=' + code + ' signal=' + signal + ')');
    serverProcess = null;
  });
  restartCount++;
  lastRestartTime = Date.now();
}

function checkHealth() {
  return new Promise(resolve => {
    const req = http.get('http://127.0.0.1:' + PORT + '/api/health', { timeout: 3000 }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(res.statusCode === 200 && body.includes('ok')));
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function watchdogLoop() {
  while (true) {
    const healthy = await checkHealth();
    if (!healthy) {
      log('❌ server 不健康，正在拉起...');
      if (serverProcess) {
        try { serverProcess.kill(); } catch (e) {}
      }
      startServer();
    } else if (!serverProcess) {
      // 端口响应但进程不在我们管理内（被外部启动）
      log('ℹ️ server 在跑但不在我管理下，认领它');
    }
    await new Promise(r => setTimeout(r, CHECK_INTERVAL));
  }
}

// === 启动 ===
if (!acquireLock()) {
  process.exit(0);
}

log('🐕 Watchdog 启动 (PID ' + process.pid + ')');
log('检查间隔: ' + CHECK_INTERVAL / 1000 + '秒');
log('监控目标: ' + SERVER_JS);

startServer();
watchdogLoop().catch(e => log('💥 Watchdog 崩溃: ' + e.message));

// 优雅退出
process.on('SIGINT', () => { log('收到 SIGINT 退出'); releaseLock(); process.exit(0); });
process.on('SIGTERM', () => { log('收到 SIGTERM 退出'); releaseLock(); process.exit(0); });
process.on('exit', releaseLock);
