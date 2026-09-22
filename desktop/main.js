const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

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
    if (bundled) return target.protocol === 'file:';
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
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
}

app.whenReady().then(() => {
  if (!hasSingleInstanceLock) return;
  createMenu();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
