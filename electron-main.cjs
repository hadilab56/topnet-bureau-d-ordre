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
    icon: path.join(__dirname, 'public/app-icon.ico')
  });

  mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  // simple clean window menu template
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

// ── persistent storage (writes to MongoDB) ──
const os = require('os');
const fs = require('fs');
const { ipcMain } = require('electron');
const { connectDB, User, Courrier } = require('./db.cjs');

const userDataPath = path.join(
  process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
  'TopnetBO'
);

// must call this before app is ready or windows directory locks will crash the app
app.setPath('userData', userDataPath);

// disable chromium gpu cache to avoid file access permission spam
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

const themeFile = path.join(userDataPath, 'theme.txt');

// prevent unhandled background warnings/errors from displaying GUI popups
process.on('uncaughtException', (err) => {
  console.warn('Background exception handled:', err.message);
});

// starts local database server instance in background
async function startEmbeddedMongo() {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const dbDir = path.join(userDataPath, 'db-data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Remove stale lock file from previous ungraceful exits
  const lockFile = path.join(dbDir, 'mongod.lock');
  try {
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
    }
  } catch (e) { /* ignore */ }

  try {
    mongod = await MongoMemoryServer.create({
      instance: {
        dbPath: dbDir,
        storageEngine: 'wiredTiger',
        port: 27027 // static port to make it easy to connect from Compass
      }
    });

    const uri = mongod.getUri();
    await connectDB(uri);
  } catch (err) {
    console.warn('Embedded MongoDB port 27027 is busy or server is already running. Connecting directly...');
    // fallback directly to the running server on 27027
    await connectDB('mongodb://127.0.0.1:27027/topnet-registry');
  }
}

ipcMain.handle('store-read', async () => {
  try {
    // Seed default users if collection is empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      await User.create([
        { username: 'admin', fullName: 'Administrateur BO', password: 'admin', role: 'ADMIN' },
        { username: 'agent', fullName: 'Agent Bureau d\'Ordre', password: 'agent', role: 'AGENT' }
      ]);
    }



    const dbUsers = await User.find({}).lean();
    const dbCourriers = await Courrier.find({}).sort({ date: -1 }).lean();

    let theme = 'light';
    try {
      if (fs.existsSync(themeFile)) {
        theme = fs.readFileSync(themeFile, 'utf8');
      }
    } catch (e) { /* ignore */ }

    // Map _id object to string for react frontend serializability
    const formattedUsers = dbUsers.map(u => ({ ...u, _id: u._id.toString() }));
    const formattedCourriers = dbCourriers.map(d => ({ ...d, _id: d._id.toString() }));

    return {
      documents: formattedCourriers,
      users: formattedUsers,
      theme
    };
  } catch (e) {
    console.error('store-read failed:', e.message);
    return null;
  }
});

ipcMain.handle('store-write', async (_event, data) => {
  try {
    if (data.users) {
      // Clear out the collection and reload
      await User.deleteMany({});
      await User.insertMany(data.users);
    }
    if (data.documents) {
      // Clear out the collection and reload
      await Courrier.deleteMany({});
      // format dates correctly for MongoDB schemas and remove nested/invalid _ids
      const formattedDocs = data.documents.map(d => {
        const docCopy = { ...d };

        // Remove parent _id if it is not a valid string to let Mongoose generate a new one
        if (docCopy._id && typeof docCopy._id === 'object') {
          delete docCopy._id;
        }

        const comments = d.comments ? d.comments.map(c => {
          const cleanComment = { ...c, date: c.date ? new Date(c.date) : new Date() };
          delete cleanComment._id;
          return cleanComment;
        }) : [];

        const history = d.history ? d.history.map(h => {
          const cleanHistory = { ...h, date: h.date ? new Date(h.date) : new Date() };
          delete cleanHistory._id;
          return cleanHistory;
        }) : [];

        return {
          ...docCopy,
          date: d.date ? new Date(d.date) : new Date(),
          comments,
          history
        };
      });
      await Courrier.insertMany(formattedDocs);
    }
    if (data.theme) {
      if (!fs.existsSync(userDataPath)) fs.mkdirSync(userDataPath, { recursive: true });
      fs.writeFileSync(themeFile, data.theme, 'utf8');
    }
    return true;
  } catch (e) {
    console.error('store-write failed:', e.message);
    return false;
  }
});
// ───────────────────────────────────────────

app.whenReady().then(async () => {
  try {
    await startEmbeddedMongo();
  } catch (err) {
    console.error('Embedded MongoDB failed to start:', err.message);
  }
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', async () => {
  try {
    const mongoose = require('mongoose');
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
  } catch (e) { /* ignore shutdown errors */ }
});

