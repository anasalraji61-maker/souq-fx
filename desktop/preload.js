const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('matrixDesktop', {
  platform: process.platform,
  apiUrl: process.env.MATRIX_API_URL || 'http://127.0.0.1:8110',
  webUrl: process.env.MATRIX_WEB_URL || 'http://127.0.0.1:8081',
  isDesktop: true,
  /** إشعار نظام حقيقي (تنبيه سعري…) — يعمل والنافذة مخفية بشريط المهام. */
  notify: (title, body, opts) =>
    ipcRenderer.invoke('matrix:notify', { title, body, silent: Boolean(opts && opts.silent) }),
  /** معلومات النسخة: version, platform, remote (هل تُحمَّل الواجهة من خادم حي). */
  appInfo: () => ipcRenderer.invoke('matrix:app-info'),
});
