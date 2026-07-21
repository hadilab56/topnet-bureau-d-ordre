const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 650,
    title: "Topnet Tunisie | Bureau d'Ordre Électronique",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    // Custom window icon if available
    icon: path.join(__dirname, 'dist/favicon.svg')
  });

  // Load the built index.html from dist directory
  mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));

  // Open DevTools in development if needed (uncomment for debug)
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  // Set standard clean menu
  const template = [
    {
      label: 'Fichier',
      submenu: [
        { label: 'Imprimer', accelerator: 'CmdOrCtrl+P', click: () => { mainWindow.webContents.send('print-command'); } },
        { type: 'separator' },
        { label: 'Quitter', role: 'quit' }
      ]
    },
    {
      label: 'Édition',
      submenu: [
        { label: 'Annuler', role: 'undo' },
        { label: 'Rétablir', role: 'redo' },
        { type: 'separator' },
        { label: 'Couper', role: 'cut' },
        { label: 'Copier', role: 'copy' },
        { label: 'Coller', role: 'paste' },
        { label: 'Tout sélectionner', role: 'selectAll' }
      ]
    },
    {
      label: 'Affichage',
      submenu: [
        { label: 'Actualiser', role: 'reload' },
        { label: 'Plein écran', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: 'Zoom Avant', role: 'zoomIn' },
        { label: 'Zoom Arrière', role: 'zoomOut' },
        { label: 'Réinitialiser Zoom', role: 'resetZoom' }
      ]
    },
    {
      label: 'Aide',
      submenu: [
        {
          label: 'À propos du Bureau d\'Ordre',
          click: async () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'À propos de Topnet B.O.',
              message: 'Topnet Tunisie - Bureau d\'Ordre Électronique v1.0.0',
              detail: 'Logiciel de gestion, d\'enregistrement et d\'archivage numérique des courriers officiels pour Topnet Tunisie.\nDéveloppé en juillet 2026.',
              buttons: ['Fermer']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Set writable userData path BEFORE app is ready to fix cache access denied errors
const userDataPath = path.join(
  process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming'),
  'TopnetBO'
);
app.setPath('userData', userDataPath);

// Disable GPU disk cache to stop the access denied error spam
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-http-cache');

// File-based persistent storage via IPC (more reliable than localStorage in Electron)
const { ipcMain } = require('electron');
const fs = require('fs');
const dataFile = path.join(userDataPath, 'bo-data.json');

ipcMain.handle('store-read', () => {
  try {
    if (fs.existsSync(dataFile)) {
      return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    }
  } catch (e) { /* ignore */ }
  return null;
});

ipcMain.handle('store-write', (_, data) => {
  try {
    if (!fs.existsSync(userDataPath)) fs.mkdirSync(userDataPath, { recursive: true });
    fs.writeFileSync(dataFile, JSON.stringify(data), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
});

// Preload messaging if needed
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
