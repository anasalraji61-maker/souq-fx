const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('matrixDesktop', {
  platform: process.platform,
  apiUrl: process.env.MATRIX_API_URL || 'http://127.0.0.1:8110',
  webUrl: process.env.MATRIX_WEB_URL || 'http://127.0.0.1:8081',
  isDesktop: true,
});
