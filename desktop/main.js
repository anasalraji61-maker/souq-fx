const { app, BrowserWindow, shell, Menu, protocol, net, Tray, nativeImage, Notification, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const WEB_URL = process.env.MATRIX_WEB_URL || 'http://127.0.0.1:8081';
// وضع التطوير: متغيّر البيئة كما كان، **أو** الراية `--dev` بسطر الأوامر. المتغيّر وحده كان يعني أن
// `npm run dev` مكتوب بـ`set ...&&` (صيغة cmd الويندوزي وحده) فلا يعمل على ماك ولا لينكس — وحزمة
// الـdmg يجب أن تُبنى على جهاز Mac فعلي (docs/DEPLOYMENT.md، خطوة البناء)، أي أن المنصّة التي تحتاج تجربة
// التطبيق قبل بنائه هي بالضبط المنصّة التي لا تعمل عليها الأوامر. الراية تعمل على الثلاث بلا أي تبعية.
const isDev = process.env.MATRIX_DESKTOP_DEV === '1' || process.argv.includes('--dev');
// حزمة ويب مُصدَّرة (`npx expo export --platform web` من مشروع mobile/، تُنسَخ إلى هذا
// المجلد باسم web-build/) — إن وُجدت (بعد بناء فعلي؛ غائبة افتراضياً بالمستودع) يُحمَّل
// exe/dmg الموزَّع منها مباشرة عبر file:// بلا أي اعتماد على خادم Metro حي (WEB_URL)، وهو
// الفارق الحقيقي بين "غلاف حول خادم تطوير محلي" (الوضع الحالي بلا هذا الملف) و"تطبيق سطح
// مكتب فعلي يعمل عند أي مستخدم نهائي" (المطلوب للإطلاق العام). في وضع التطوير
// (MATRIX_DESKTOP_DEV=1) يبقى السلوك القديم كما هو دوماً — تحميل حي من WEB_URL، بلا تغيير.
const BUNDLED_WEB_DIR = path.join(__dirname, 'web-build');
const BUNDLED_WEB_INDEX = path.join(BUNDLED_WEB_DIR, 'index.html');

// ـــ لماذا مخطّط خاص (`matrix://app`) ولا `file://` ـــ
// `expo export --platform web` يكتب بـ`index.html` مساراً **مطلقاً من الجذر**:
//   <script src="/_expo/static/js/web/entry-<hash>.js" defer></script>
// (مُتحقَّق من شيفرة `@expo/cli@57.0.24` نفسها: `combineUrlPath(baseUrl, filename)` بـ
// `serializeHtml.js` و`baseUrl` فارغ ما لم يُضبط `experiments.baseUrl` — وهو غير مضبوط
// بـ`mobile/app.json`، فالناتج يبدأ بشرطة مائلة دائماً).
// بـ`loadFile` يصير أصل الصفحة `file://`، فيُحلّ `/_expo/...` إلى **جذر قرص المستخدم**
// (`file:///_expo/...`) لا إلى مجلّد الحزمة — فلا يُحمَّل أي سكربت. والأسوأ أن
// `loadFile` نفسه **ينجح** (ملف الـhtml قُرئ فعلاً)، فـ`loadApp.catch` لا يُستدعى ولا تظهر
// صفحة التعذّر: يحصل من ثبّت الـexe على **نافذة سوداء صامتة** بلا أي تفسير.
// المخطّط المخصَّص يعطي الصفحة أصلاً حقيقياً (`matrix://app`) فتُحلّ المسارات المطلقة
// داخل `web-build/`، ويجعلها **سياقاً آمناً** (`secure: true`) فيعمل `localStorage`
// (تخزين react-native-web) و`crypto.subtle` — وكلاهما يُمنع أو يُصبح غير موثوق بأصل
// `file://` المُعتِم. ولأن الباك-إند `allow_origins=["*"]` (backend/main.py) فلا أثر
// لتغيير الأصل على نداءات الـAPI.
const APP_SCHEME = 'matrix';
const APP_HOST = 'app';
const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;

// يجب أن يسبق `app.ready` — لذلك بالمستوى الأعلى لا داخل `whenReady`.
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true },
  },
]);

/** يخدم ملفّات `web-build/` عبر المخطّط الخاص، بحارس ضد الخروج من المجلّد. */
function registerBundledWebProtocol() {
  const root = fs.realpathSync(BUNDLED_WEB_DIR);
  protocol.handle(APP_SCHEME, async (request) => {
    let pathname;
    try {
      ({ pathname } = new URL(request.url));
    } catch {
      return new Response('bad request', { status: 400 });
    }
    // `decodeURIComponent` لأن أسماء الملفات قد تحمل محارف مُرمَّزة؛ فشل الترميز = طلب فاسد.
    let rel;
    try {
      rel = decodeURIComponent(pathname);
    } catch {
      return new Response('bad request', { status: 400 });
    }
    if (rel === '/' || rel === '') rel = '/index.html';
    const target = path.join(root, rel);
    // الحارس: `path.join` يطوي `..` — فبعده يكفي التأكّد أن الناتج داخل الجذر.
    if (target !== root && !target.startsWith(root + path.sep)) {
      return new Response('forbidden', { status: 403 });
    }
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      return new Response('not found', { status: 404 });
    }
    return net.fetch(pathToFileURL(target).toString());
  });
}

/** @type {Electron.BrowserWindow | null} */
let mainWindow = null;


// ـــ وضع الخادم الحي (الإصدار الموزَّع للمستخدمين) ـــ
// إن ضُبط عنوان خادم MATRIX الحي (متغيّر البيئة MATRIX_REMOTE_URL، أو ملف desktop-config.json بجانب
// التطبيق أو بمجلد بيانات المستخدم بالشكل {"remoteUrl":"https://..."}) تُحمَّل الواجهة منه مباشرة:
// نفس نسخة الويب التي يخدمها الباك-إند، فتصل التحديثات لكل مستخدمي الديسكتوب فوراً بلا إعادة تثبيت.
function readDesktopConfig() {
  const candidates = [
    path.join(path.dirname(process.execPath), 'desktop-config.json'),
    path.join(__dirname, 'desktop-config.json'),
  ];
  try {
    candidates.unshift(path.join(app.getPath('userData'), 'desktop-config.json'));
  } catch {
    // app.getPath غير متاح قبل الجاهزية ببعض البيئات — نكمل بالمرشحين الآخرين
  }
  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8')) || {};
    } catch {
      // ملف تالف — يُتجاهَل
    }
  }
  return {};
}

function resolveRemoteUrl() {
  const raw = (process.env.MATRIX_REMOTE_URL || readDesktopConfig().remoteUrl || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : '';
  } catch {
    return '';
  }
}

// ـــ حفظ حجم ومكان النافذة بين التشغيلات ـــ
function windowStateFile() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadWindowState() {
  try {
    const s = JSON.parse(fs.readFileSync(windowStateFile(), 'utf8'));
    if (Number.isFinite(s.width) && Number.isFinite(s.height)) return s;
  } catch {
    // لا حالة محفوظة بعد
  }
  return { width: 1440, height: 920 };
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    const maximized = mainWindow.isMaximized();
    const b = maximized ? (mainWindow.__lastNormalBounds || mainWindow.getBounds()) : mainWindow.getBounds();
    fs.writeFileSync(windowStateFile(), JSON.stringify({ ...b, maximized }));
  } catch {
    // الكتابة فشلت (قرص ممتلئ/صلاحيات) — ليس حرجاً
  }
}

// ـــ أيقونة شريط المهام (Tray) ـــ
// إغلاق النافذة يخفيها إلى الشريط بدل إنهاء التطبيق، فتبقى التنبيهات السعرية تعمل بالخلفية.
// «خروج» من قائمة الأيقونة هو الإنهاء الفعلي.
let tray = null;
let isQuitting = false;

function showMainWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createTray() {
  if (tray || process.platform === 'darwin') return; // ماك: أيقونة الـDock تكفي
  const iconFile = fs.existsSync(WINDOW_ICON) ? WINDOW_ICON : path.join(__dirname, 'build', 'icon.png');
  const image = fs.existsSync(iconFile) ? nativeImage.createFromPath(iconFile) : nativeImage.createEmpty();
  try {
    tray = new Tray(image);
  } catch (err) {
    console.error('[MATRIX] tray unavailable:', err);
    return;
  }
  tray.setToolTip('MATRIX Charts');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'فتح MATRIX  /  Open', click: showMainWindow },
      { type: 'separator' },
      {
        label: 'خروج  /  Quit',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ])
  );
  tray.on('click', showMainWindow);
}

// ـــ إشعارات النظام ـــ
// الواجهة تستدعي window.matrixDesktop.notify(title, body) (من preload.js) لتنبيه سعري حقيقي من النظام
// حتى والنافذة مخفية. النقر على الإشعار يُظهر النافذة. النصوص تُقصّ وتُنظَّف لمنع إساءة الاستخدام.
function registerNotificationBridge() {
  ipcMain.handle('matrix:notify', (_event, payload) => {
    if (!Notification.isSupported()) return false;
    const title = String((payload && payload.title) || 'MATRIX').slice(0, 120);
    const body = String((payload && payload.body) || '').slice(0, 400);
    const n = new Notification({
      title,
      body,
      silent: Boolean(payload && payload.silent),
      icon: fs.existsSync(WINDOW_ICON) ? WINDOW_ICON : undefined,
    });
    n.on('click', showMainWindow);
    n.show();
    return true;
  });
  ipcMain.handle('matrix:app-info', () => ({
    version: app.getVersion(),
    platform: process.platform,
    remote: Boolean(REMOTE_URL),
  }));
}

let REMOTE_URL = '';

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

// `shell.openExternal` يمرّر الرابط لنظام التشغيل كما هو — نسمح فقط بالبروتوكولات الآمنة
// المعروفة (ويب + بريد) كي لا يُشغِّل رابط `file:`/بروتوكول مخصص برنامجاً محلياً (توصية أمان Electron).
const EXTERNAL_PROTOCOLS = new Set(['https:', 'http:', 'mailto:']);

function openExternalSafe(url) {
  try {
    if (EXTERNAL_PROTOCOLS.has(new URL(url).protocol)) shell.openExternal(url);
  } catch {
    // رابط غير صالح — يُتجاهَل بصمت
  }
}

/** هل الرابط جزء من واجهة التطبيق نفسها (الحزمة المضمَّنة أو خادم الويب المحلي)؟ */
function isAppUrl(url, bundled) {
  try {
    const target = new URL(url);
    // لا تُقارَن الأصول: `new URL('matrix://app/x').origin` بـNode يساوي السلسلة 'null'
    // (مخطّط غير قياسي بمحلّل WHATWG) — فمقارنة الأصول كانت ستُصدِّق **أي** رابط بمخطّط
    // غريب. المخطّط والمضيف معاً هما الفحص الصحيح بالعملية الرئيسة.
    if (REMOTE_URL) return target.origin === new URL(REMOTE_URL).origin;
    if (bundled) return target.protocol === `${APP_SCHEME}:` && target.host === APP_HOST;
    return target.origin === new URL(WEB_URL).origin;
  } catch {
    return false;
  }
}

/** يبني صفحة خطأ ودّية بهوية MATRIX. المحتوى يُرمَّز بالكامل: بلا ترميز كان `#` بقيم الألوان
 * (`#0B1220`) يُقرأ كبداية fragment فيُقطع الـdata: URL وتظهر نافذة فارغة بدل الرسالة. */
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * الصفحة **ثنائية اللغة عمداً** (عربي + إنجليزي معاً): تظهر قبل تحميل الواجهة، أي قبل أن تُعرف
 * لغة المتداول المحفوظة داخل التطبيق، والأسواق المستهدفة ثلاثة (الوطن العربي وأمريكا وأوروبا) —
 * فنسخة عربية وحدها تترك مستخدم exe/dmg بأوروبا أمام نصّ لا يقرأه.
 */
function showFallbackPage(ar, en) {
  if (!mainWindow) return;
  const html =
    '<!doctype html><html lang="ar"><head><meta charset="utf-8"><title>MATRIX Charts</title></head>' +
    '<body style="background:#0B1220;color:#94A3B8;font-family:system-ui,sans-serif;padding:40px;text-align:center">' +
    '<h1 style="color:#2DD4BF;letter-spacing:4px">MATRIX</h1>' +
    `<div dir="rtl"><p style="color:#E8EEF9;font-size:17px">${escapeHtml(ar.message)}</p>` +
    `<p>${escapeHtml(ar.hint)}</p></div>` +
    '<hr style="border:0;border-top:1px solid #243049;max-width:320px;margin:28px auto">' +
    `<div dir="ltr"><p style="color:#E8EEF9;font-size:17px">${escapeHtml(en.message)}</p>` +
    `<p>${escapeHtml(en.hint)}</p></div></body></html>`;
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`).catch(() => {});
  if (!mainWindow.isVisible()) mainWindow.show();
}

function createWindow() {
  const state = loadWindowState();
  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: Number.isFinite(state.x) ? state.x : undefined,
    y: Number.isFinite(state.y) ? state.y : undefined,
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

  mainWindow.once('ready-to-show', () => {
    if (state.maximized) mainWindow?.maximize();
    mainWindow?.show();
  });
  const rememberNormal = () => {
    if (mainWindow && !mainWindow.isMaximized() && !mainWindow.isMinimized()) {
      mainWindow.__lastNormalBounds = mainWindow.getBounds();
    }
  };
  mainWindow.on('resize', rememberNormal);
  mainWindow.on('move', rememberNormal);
  // الإغلاق يخفي إلى شريط المهام (ويندوز/لينكس) ما لم يكن خروجاً فعلياً
  mainWindow.on('close', (event) => {
    saveWindowState();
    if (!isQuitting && tray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  const hasBundledBuild = !isDev && fs.existsSync(BUNDLED_WEB_INDEX);
  const loadApp = mainWindow.loadURL(
    REMOTE_URL ? REMOTE_URL : hasBundledBuild ? `${APP_ORIGIN}/index.html` : WEB_URL
  );

  // شبكة أمان: إن علق التحميل (خادم لا يردّ) لا يبقى التطبيق مخفياً بلا نافذة إطلاقاً.
  const showTimer = setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) mainWindow.show();
  }, 5000);
  mainWindow.once('show', () => clearTimeout(showTimer));

  // نصّ المستخدم النهائي مقابل نصّ المطوّر: النسخة الموزَّعة (exe/dmg) كانت تعرض للمتداول
  // «شغّل start-mobile.bat» أو «أعد تصدير حزمة الويب (expo export --platform web)» ومعهما عنوان
  // `http://127.0.0.1:8081` — تعليمات بيئة تطوير لا معنى لها لمن حمّل المثبِّت من الموقع. الآن
  // تظهر تلك الحروف بالتشغيل غير المحزَّم وحده (`app.isPackaged === false`).
  loadApp.catch(() => {
    if (REMOTE_URL) {
      showFallbackPage(
        { message: 'تعذّر الاتصال بخادم MATRIX', hint: 'تحقّق من اتصال الإنترنت ثم أعد فتح التطبيق' },
        { message: 'Could not reach the MATRIX server', hint: 'Check your internet connection, then reopen the app' }
      );
      return;
    }
    if (!app.isPackaged) {
      const devHintAr = hasBundledBuild
        ? 'أعد تصدير حزمة الويب (expo export --platform web) ثم أعد التثبيت'
        : 'شغّل start-mobile.bat ثم أعد فتح سطح المكتب';
      const devHintEn = hasBundledBuild
        ? 'Re-export the web bundle (expo export --platform web), then reinstall'
        : 'Run start-mobile.bat, then reopen the desktop app';
      const devTargetAr = hasBundledBuild ? 'الحزمة المضمَّنة' : WEB_URL;
      const devTargetEn = hasBundledBuild ? 'the bundled web build' : WEB_URL;
      showFallbackPage(
        { message: `تعذر الاتصال بـ ${devTargetAr}`, hint: devHintAr },
        { message: `Could not load ${devTargetEn}`, hint: devHintEn }
      );
      return;
    }
    showFallbackPage(
      {
        message: 'تعذّر فتح واجهة MATRIX',
        hint: 'أغلق التطبيق وأعد فتحه — وإن تكرّر، أعد تثبيت MATRIX Charts. رسوماتك وإعداداتك محفوظة.',
      },
      {
        message: 'MATRIX could not start',
        hint: 'Close the app and open it again — if it keeps happening, reinstall MATRIX Charts. Your drawings and settings are safe.',
      }
    );
  });

  // انهيار عملية العرض (نفاد ذاكرة/خطأ GPU…) كان يترك نافذة فارغة سوداء بلا أي تفسير.
  let rendererCrashes = 0;
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    if (!mainWindow || details.reason === 'clean-exit') return;
    rendererCrashes += 1;
    if (rendererCrashes <= 1) {
      mainWindow.webContents.reload();
      return;
    }
    showFallbackPage(
      {
        message: 'توقّفت واجهة MATRIX بشكل غير متوقع',
        hint: 'أغلق التطبيق وأعد فتحه — رسوماتك وإعداداتك محفوظة',
      },
      {
        message: 'MATRIX stopped unexpectedly',
        hint: 'Close the app and open it again — your drawings and settings are safe',
      }
    );
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalSafe(url);
    return { action: 'deny' };
  });

  // حارس تنقّل: أي رابط خارجي يُفتح بالمتصفح الافتراضي بدل أن يستبدل واجهة MATRIX داخل
  // النافذة نفسها (بلا زر رجوع ولا قائمة، كان المستخدم سيعلق بموقع غريب حتى يغلق التطبيق).
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isAppUrl(url, hasBundledBuild)) return;
    event.preventDefault();
    openExternalSafe(url);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// نسخة واحدة فقط: فتح الاختصار مرة ثانية يُظهر النافذة القائمة بدل تشغيل تطبيق ثانٍ بجانبها.
const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showMainWindow();
  });
}

app.whenReady().then(() => {
  if (!hasSingleInstanceLock) return;
  // يُسجَّل فقط حين توجد حزمة فعلاً: بالتشغيل غير المحزَّم لا مجلّد `web-build/` أصلاً
  // (`realpathSync` كان سيرمي)، والتحميل يبقى من `WEB_URL` كما كان.
  if (!isDev && fs.existsSync(BUNDLED_WEB_INDEX)) {
    try {
      registerBundledWebProtocol();
    } catch (err) {
      console.error('[MATRIX] failed to register bundled web protocol:', err);
    }
  }
  REMOTE_URL = isDev ? '' : resolveRemoteUrl();
  registerNotificationBridge();
  createMenu();
  createWindow();
  createTray();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  saveWindowState();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
