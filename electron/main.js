const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 650,
    title: 'TETORD',
    backgroundColor: '#f5f6f4',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadFile(path.join(__dirname, '..', 'MiWord', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  return win;
}

ipcMain.handle('tetord:save-file', async (_event, payload) => {
  const { options = {}, base64 = '' } = payload || {};
  const filters = Array.isArray(options.filters) ? options.filters : [];
  let filePath = options.filePath || null;
  if (!filePath) {
    const result = await dialog.showSaveDialog({
      title: 'Guardar como',
      defaultPath: options.suggestedName || 'Mi documento',
      filters: filters.length ? filters : [{ name: 'Todos los archivos', extensions: ['*'] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    filePath = result.filePath;
  }
  await fs.writeFile(filePath, Buffer.from(base64, 'base64'));
  return { canceled: false, path: filePath };
});

ipcMain.handle('tetord:save-pdf', async (event, options = {}) => {
  let filePath = options.filePath || null;
  if (!filePath) {
    const result = await dialog.showSaveDialog({
      title: 'Guardar PDF',
      defaultPath: options.suggestedName || 'Mi documento.pdf',
      filters: [{ name: 'Documento PDF', extensions: ['pdf'] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true, saved: false };
    filePath = result.filePath;
  }
  const pdf = await event.sender.printToPDF({ printBackground: true, preferCSSPageSize: true });
  await fs.writeFile(filePath, pdf);
  return { canceled: false, saved: true, path: filePath };
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
