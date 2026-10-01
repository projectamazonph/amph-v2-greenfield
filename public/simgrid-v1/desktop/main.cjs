const { app, BrowserWindow, dialog, shell, session } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('node:path');
const { fileURLToPath } = require('node:url');

const APP_TITLE = 'Project Amazon PH Academy SimGrid';
const APP_ROOT = app.getAppPath();
const START_PAGE = path.join(APP_ROOT, 'index.html');
const USER_DATA_DIR = path.join(app.getPath('appData'), APP_TITLE);

let mainWindow;

function configureAutoUpdater() {
  if (!app.isPackaged || process.platform !== 'win32') return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-available', async (info) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const choice = await dialog.showMessageBox(mainWindow, {
      type: 'info', title: APP_TITLE,
      message: `SimGrid ${info.version} is available.`,
      detail: 'Download the update now?',
      buttons: ['Download update', 'Later'], defaultId: 0, cancelId: 1
    });
    if (choice.response === 0) void autoUpdater.downloadUpdate();
  });

  autoUpdater.on('update-downloaded', async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const choice = await dialog.showMessageBox(mainWindow, {
      type: 'info', title: APP_TITLE,
      message: 'SimGrid has been updated and is ready to install.',
      detail: 'Restart now to finish installing the update?',
      buttons: ['Restart and install', 'Later'], defaultId: 0, cancelId: 1
    });
    if (choice.response === 0) autoUpdater.quitAndInstall();
  });

  autoUpdater.on('error', (error) => {
    console.warn('SimGrid update check failed:', error.message);
  });
  void autoUpdater.checkForUpdates();
}

function isLocalAppUrl(url) {
  if (!url.startsWith('file://')) return false;

  try {
    const localPath = path.normalize(fileURLToPath(url));
    const appRoot = path.normalize(APP_ROOT);
    return localPath === appRoot || localPath.startsWith(`${appRoot}${path.sep}`);
  } catch {
    return false;
  }
}

function openExternalUrl(url) {
  if (/^https?:\/\//i.test(url)) {
    void shell.openExternal(url);
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: APP_TITLE,
    width: 1440,
    height: 960,
    minWidth: 980,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f7f8fa',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isLocalAppUrl(url)) return;
    event.preventDefault();
    openExternalUrl(url);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.once('did-fail-load', (_event, errorCode, errorDescription) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    dialog.showErrorBox(
      APP_TITLE,
      `SimGrid could not start. Please reinstall the application.\n\n${errorDescription} (${errorCode})`
    );
    app.quit();
  });

  void mainWindow.loadFile(START_PAGE).catch((error) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    dialog.showErrorBox(
      APP_TITLE,
      `SimGrid could not start. Please reinstall the application.\n\n${error.message}`
    );
    app.quit();
  });
}

app.whenReady().then(() => {
  // Keep Chromium localStorage, including student progress, outside the install
  // directory so upgrades and per-user reinstalls do not replace it.
  app.setPath('userData', USER_DATA_DIR);

  if (process.platform === 'win32') {
    app.setAppUserModelId('com.projectamazonph.simgrid');
  }

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    // The simulators do not need camera, microphone, notifications, or location access.
    callback(permission === 'clipboard-read' || permission === 'clipboard-sanitized-write');
  });

  createMainWindow();
  configureAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
