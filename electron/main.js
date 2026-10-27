const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const http = require('http');
const { fork } = require('child_process');

let mainWindow = null;
let serverProcess = null;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const PORT = process.env.PORT || 3000;

// Hardware Acceleration & GPU Optimizations (60 FPS UI & Performance Standard)
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      if (!isDev) {
        await startStandaloneServer();
      }
      await waitForServer(`http://localhost:${PORT}`);
      createWindow();
    } catch (err) {
      console.error('Failed to start application:', err);
      dialog.showErrorBox('Uygulama Başlatma Hatası', `Sunucu başlatılamadı:\n${err.message}`);
      app.quit();
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

function startStandaloneServer() {
  return new Promise((resolve, reject) => {
    // In packaged app, app root is process.resourcesPath + '/app' or app.getAppPath()
    const appPath = app.getAppPath();
    const serverPath = path.join(appPath, '.next', 'standalone', 'server.js');

    console.log(`[Main] Starting standalone Next.js server at: ${serverPath}`);

    const env = Object.assign({}, process.env, {
      PORT: String(PORT),
      NODE_ENV: 'production',
      HOSTNAME: '127.0.0.1',
      ELECTRON_USER_DATA_PATH: app.getPath('userData')
    });

    serverProcess = fork(serverPath, [], {
      env,
      cwd: path.join(appPath, '.next', 'standalone'),
      stdio: ['ignore', 'pipe', 'pipe', 'ipc']
    });

    let hasStarted = false;

    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      console.log(`[Server] ${msg}`);
      if (!hasStarted && (msg.includes('Ready') || msg.includes('Listening') || msg.includes('http'))) {
        hasStarted = true;
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Server Error] ${data.toString()}`);
    });

    serverProcess.on('error', (err) => {
      console.error('[Server process error]', err);
      if (!hasStarted) reject(err);
    });

    serverProcess.on('exit', (code) => {
      console.log(`[Server] process exited with code ${code}`);
      if (!hasStarted && code !== 0) {
        reject(new Error(`Next.js server exited with code ${code}`));
      }
    });

    // Fallback timer resolve in case stdout message format changes
    setTimeout(() => {
      if (!hasStarted) {
        hasStarted = true;
        resolve();
      }
    }, 4000);
  });
}

function waitForServer(url, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      http.get(url, (res) => {
        resolve();
      }).on('error', () => {
        if (attempts >= maxAttempts) {
          reject(new Error(`Server unreachable at ${url} after ${maxAttempts} attempts`));
        } else {
          setTimeout(check, 500);
        }
      });
    };
    check();
  });
}

function createWindow() {
  const iconPath = path.join(__dirname, '..', 'public', 'images', 'logo.png');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Çiçekana ERP - Yönetim Paneli',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });

  mainWindow.setMenu(null); // Hide default menu bar for clean app feel

  const startUrl = isDev ? `http://localhost:3020` : `http://localhost:${PORT}`;
  console.log(`[Main] Loading window URL: ${startUrl}`);

  mainWindow.loadURL(startUrl).catch((err) => {
    console.error('Failed to load URL:', err);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function cleanup() {
  if (serverProcess) {
    console.log('[Main] Terminating Next.js server process...');
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

app.on('window-all-closed', () => {
  cleanup();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  cleanup();
});
