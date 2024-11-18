/* eslint-disable import/prefer-default-export */
/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { spawn } from 'child_process';
// eslint-disable-next-line import/no-cycle
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

const fs = require('fs');

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.handle('get-resource-path', () => {
  const exeDir = path.dirname(app.getPath('exe'));

  // Construct the path to the resources folder
  const resourcePath = path.join(exeDir, 'ArrayParser.exe');
  return resourcePath;
});

ipcMain.on('excute-program', (event, programPath) => {
  try {
    const child = spawn(programPath, { detached: true, stdio: 'ignore' }); // Example config
    child.on('error', (err) => {
      console.error('Failed to start process:', err);
    });

    child.on('close', (code) => {
      console.log(`Child process exited with code ${code}`);
    });
    child.unref(); // Allow the process to continue running independently if needed
  } catch (error) {
    console.error('Error executing program:', error);
  }
});

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

ipcMain.on('set-title', (event, arg) => {
  const webContents = event.sender;
  const win = BrowserWindow.fromWebContents(webContents);
  win!.setTitle(`📄	${arg} - 3D Array Editor`);
});

export function handleOpenFile(window: BrowserWindow) {
  return async () => {
    try {
      const result = await dialog.showOpenDialog(window, {
        properties: ['openFile'],
        filters: [{ name: 'Text Files', extensions: ['txt'] }],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        window.webContents.send('open-file-result', {
          filePath,
          content: fileContent,
        });
      }
    } catch (error) {
      console.error('Error opening file:', error);
      window.webContents.send('open-file-result', {
        error: 'Error opening file',
      });
    }
  };
}

// eslint-disable-next-line consistent-return

ipcMain.on('request-set-program-path', () => {
  console.log('request-set-program-path');
});

ipcMain.removeHandler('send-data-to-main');

ipcMain.handle('send-data-to-main', async (event, arg) => {
  console.log(arg.data);
  try {
    let filePath: string | undefined;
    let canceled = false;

    if (arg.saveDir === '') {
      const result = await dialog.showSaveDialog({
        title: 'Save Data',
        defaultPath: 'Untitled.txt',
        filters: [{ name: 'Text Files', extensions: ['txt'] }],
      });
      canceled = result.canceled;
      filePath = result.filePath;
    } else {
      filePath = arg.saveDir;
    }

    if (canceled) {
      return { success: false, error: 'Save operation was canceled.' };
    }

    if (!filePath) {
      return { success: false, error: 'No file path provided.' };
    }

    const fileContent = JSON.stringify(arg.data, null, 2);
    await fs.promises.writeFile(filePath, fileContent, 'utf8');
    return { success: true, fileName: filePath };
  } catch (error) {
    console.error('Error saving data:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unknown error occurred.' };
  }
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
