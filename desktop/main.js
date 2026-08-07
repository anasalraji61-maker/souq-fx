const { app, BrowserWindow, shell, Menu } = require('electron');

const WEB_URL = process.env.MATRIX_WEB_URL || 'http://127.0.0.1:8081';
const API_URL = process.env.MATRIX_API_URL || 'http://127.0.0.1:8110';
const isDev = process.env.MATRIX_DESKTOP_DEV === '1';

/** @type {Electron.BrowserWindow | null} */
let mainWindow = null;

function createMenu() {
  // لا قائمة «عرض» في شريط النافذة — واجهة MATRIX داخل التطبيق فقط
  Menu.setApplicationMenu(null);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0B1220',
    title: 'MATRIX Charts',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: require('path').join(__dirname, 'preload.js'),
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.loadURL(WEB_URL).catch(() => {
    mainWindow?.loadURL(
      `data:text/html,<body style="background:#0B1220;color:#94A3B8;font-family:sans-serif;padding:40px;text-align:center"><h1 style="color:#2DD4BF">MATRIX</h1><p>تعذر الاتصال بـ ${WEB_URL}</p><p>شغّل start-mobile.bat ثم أعد فتح سطح المكتب</p></body>`
    );
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createMenu();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
