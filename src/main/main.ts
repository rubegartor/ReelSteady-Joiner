import { BrowserWindow, HandlerDetails, Menu, WindowOpenHandlerResponse, app, shell } from 'electron';
import { join } from 'node:path';

import { isDev } from '@main/util';

import './app';

export let mainWindow: BrowserWindow | null = null;

Menu.setApplicationMenu(null);

const RESOURCES_PATH: string = app.isPackaged ? join(process.resourcesPath) : join(__dirname, '../../src/renderer/src/assets');

const getAssetPath = (...paths: string[]): string => {
  return join(RESOURCES_PATH, ...paths);
};

function createWindow(): void {
  if (process.platform === 'darwin') {
    app.dock.setIcon(getAssetPath('icon.png'));
  }

  mainWindow = new BrowserWindow({
    width: 960,
    height: 620,
    minWidth: 960,
    minHeight: 620,
    show: false,
    icon: getAssetPath('icon.png'),
    frame: false,
    resizable: false,
    autoHideMenuBar: true,
    center: true,
    darkTheme: true,
    maximizable: false,
    fullscreenable: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  });

  mainWindow.on('ready-to-show', (): void => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details: HandlerDetails): WindowOpenHandlerResponse => {
    shell.openExternal(details.url).then();
    return { action: 'deny' };
  });

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']).then();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html')).then();
  }
}

app.whenReady().then((): void => {
  app.setAppUserModelId('org.rubegartor.reelsteady-joiner');

  createWindow();

  app.on('activate', function (): void {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', (): void => {
  app.quit();
});
