const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const WEB_URL = process.env.MATRIX_WEB_URL || 'http://127.0.0.1:8081';
const API_URL = process.env.MATRIX_API_URL || 'http://127.0.0.1:8110';
const isDev = process.env.MATRIX_DESKTOP_DEV === '1';
// حزمة ويب مُصدَّرة (`npx expo export --platform web` من مشروع mobile/، تُنسَخ إلى هذا
// المجلد باسم web-build/) — إن وُجدت (بعد بناء فعلي؛ غائبة افتراضياً بالمستودع) يُحمَّل
// exe/dmg الموزَّع منها مباشرة عبر file:// بلا أي اعتماد على خادم Metro حي (WEB_URL)، وهو
// الفارق الحقيقي بين "غلاف حول خادم تطوير محلي" (الوضع الحالي بلا هذا الملف) و"تطبيق سطح
// مكتب فعلي يعمل عند أي مستخدم نهائي" (المطلوب للإطلاق العام). في وضع التطوير
// (MATRIX_DESKTOP_DEV=1) يبقى السلوك القديم كما هو دوماً — تحميل حي من WEB_URL، بلا تغيير.
const BUNDLED_WEB_INDEX = path.join(__dirname, 'web-build', 'index.html');

/** @type {Electron.BrowserWindow | null} */
let mainWindow = null;

function createMenu() {
  // لا قائمة «عرض» في شريط النافذة — واجهة MATRIX داخل التطبيق فقط
  Menu.setApplicationMenu(null);
}

// أيقونة النافذة أثناء التطوير (`npm run dev`/`start` غير المُحزَّم) — نسخة exe/dmg
// الموزَّعة تستخدم الأيقونة المضمَّنة بملف التنفيذ نفسه أصلاً (`build.win.icon`/
// `build.mac.icon` بـpackage.json)، فهذا فقط لتطابق شكل نافذة التطوير مع الشكل
// النهائي الموزَّع. `.ico` صالح على ويندوز؛ macOS يتجاهل خيار BrowserWindow.icon
// (تستخدم الأيقونة المضمَّنة بالحزمة بدلاً منه) — بلا أي تعارض.
const WINDOW_ICON = path.join(__dirname, 'build', 'icon.ico');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0B1220',
    title: 'MATRIX Charts',
    icon: fs.existsSync(WINDOW_ICON) ? WINDOW_ICON : undefined,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  const hasBundledBuild = !isDev && fs.existsSync(BUNDLED_WEB_INDEX);
  const loadApp = hasBundledBuild
    ? mainWindow.loadFile(BUNDLED_WEB_INDEX)
    : mainWindow.loadURL(WEB_URL);

  loadApp.catch(() => {
    const fallbackHint = hasBundledBuild
      ? 'أعد تصدير حزمة الويب (expo export --platform web) ثم أعد التثبيت'
      : 'شغّل start-mobile.bat ثم أعد فتح سطح المكتب';
    const fallbackTarget = hasBundledBuild ? 'الحزمة المضمَّنة' : WEB_URL;
    mainWindow?.loadURL(
      `data:text/html,<body style="background:#0B1220;color:#94A3B8;font-family:sans-serif;padding:40px;text-align:center"><h1 style="color:#2DD4BF">MATRIX</h1><p>تعذر الاتصال بـ ${fallbackTarget}</p><p>${fallbackHint}</p></body>`
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
