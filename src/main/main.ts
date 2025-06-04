/* eslint global-require: off, no-console: off, promise/always-return: off */

import path from 'path';
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import * as fs from 'fs';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
let editorSnapshot: any = null;
let openedFilePath: string | null = null;
let copiedFilePath: string | null = null;

const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '../../assets');

const getAssetPath = (...paths: string[]): string => {
  return path.join(RESOURCES_PATH, ...paths);
};

const NOTES_DIR = path.join(RESOURCES_PATH, 'notes');

function ensureNotesDir() {
  if (!fs.existsSync(NOTES_DIR)) {
    fs.mkdirSync(NOTES_DIR, { recursive: true });
  }
}

function copyToNotes(originalPath: string): string {
  ensureNotesDir();
  const baseName = path.basename(originalPath);
  const destination = path.join(NOTES_DIR, baseName);
  fs.copyFileSync(originalPath, destination);
  return destination;
}

function readDirectoryTree(dirPath: string): FileTreeNode {
  const name = path.basename(dirPath);

  const stats = fs.statSync(dirPath);
  if (!stats.isDirectory()) {
    throw new Error(`${dirPath} is not a directory`);
  }

  const children: FileTreeNode[] = [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      children.push(readDirectoryTree(fullPath));
    } else {
      children.push({
        name: entry.name,
        path: fullPath,
        isDirectory: false,
      });
    }
  }

  return {
    name,
    path: dirPath,
    isDirectory: true,
    children,
  };
}

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default({ showDevTools: false });
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

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
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

  // Save shapes (either to existing file or ask save dialog)
  ipcMain.handle('save-shapes', async (_, json: string, file: string) => {
    if (file !== '') {
      fs.writeFileSync(file, json, 'utf-8');
      return;
    }
  });

  // Load shapes from file
  ipcMain.handle('load-shapes', async (_, file: string) => {
    if (
      file !== '' &&
      fs.existsSync(file) &&
      !fs.lstatSync(file).isDirectory()
    ) {
      const json = fs.readFileSync(file, 'utf-8');
      return json;
    }
    return null;
  });

  // Read directory contents
  ipcMain.handle('read-directory', async (_event, dirPath: string) => {
    try {
      const items = fs.readdirSync(dirPath);
      return items.map((name) => {
        const fullPath = path.join(dirPath, name);
        const isDirectory = fs.statSync(fullPath).isDirectory();
        return { name, path: fullPath, isDirectory };
      });
    } catch (error) {
      console.error('Failed to read directory:', error);
      return [];
    }
  });

  // Create folder handler
  ipcMain.handle(
    'create-folder',
    async (_event, parentPath: string, folderName: string) => {
      const newPath = path.join(parentPath, folderName);
      try {
        fs.mkdirSync(newPath);
        return { success: true, path: newPath };
      } catch (error) {
        console.error(error);
        return { success: false };
      }
    },
  );

  // Create file handler (write current editor snapshot or empty JSON if none)
  ipcMain.handle(
    'create-file',
    async (_event, parentPath: string, fileName: string) => {
      const newPath = path.join(parentPath, fileName);
      try {
        // Use editorSnapshot or fallback to empty object
        const content = editorSnapshot
          ? JSON.stringify(editorSnapshot, null, 2)
          : '{}';
        fs.writeFileSync(newPath, content, 'utf-8');
        return { success: true, path: newPath };
      } catch (error) {
        console.error(error);
        return { success: false };
      }
    },
  );

  // Delete file or folder
  ipcMain.handle('delete-path', async (_event, targetPath: string) => {
    try {
      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(targetPath);
      }
      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false };
    }
  });

  // Rename file or folder properly
  ipcMain.handle(
    'rename-path',
    async (_event, oldPath: string, newName: string) => {
      try {
        const newPath = path.resolve(path.dirname(oldPath), newName);
        if (fs.existsSync(newPath)) {
          // Prevent overwrite
          throw new Error('Target name already exists');
        }
        await fs.promises.rename(oldPath, newPath);
        return { success: true, path: newPath };
      } catch (error) {
        console.error('Rename failed:', error);
        return { success: false, error: (error as Error).message };
      }
    },
  );

  ipcMain.handle('getFolderTree', async (_event, rootPath: string) => {
    try {
      const tree = readDirectoryTree(rootPath);
      return tree;
    } catch (error) {
      console.error('Failed to read folder tree:', error);
    }
  });

  // Set current editor snapshot from renderer
  ipcMain.handle('set-snapshot', async (_event, snapshot: any) => {
    if (!editorSnapshot) {
      editorSnapshot = snapshot;
    }
  });

  ipcMain.handle('get-snapshot', async (_event) => {
    return editorSnapshot;
  });

  // Return RESOURCES_PATH for assets etc
  ipcMain.handle('getResourcePath', async (_event) => {
    return RESOURCES_PATH;
  });

  // Return copied file path (for opened file)
  ipcMain.handle('getOpenedFile', () => {
    return copiedFilePath;
  });

  // Initialize updater
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('open-file', (event, filePath) => {
  event.preventDefault();
  openedFilePath = filePath;
  copiedFilePath = copyToNotes(filePath);
});

app
  .whenReady()
  .then(() => {
    const file = process.argv.find((arg) => arg.endsWith('.ltxnote'));
    if (file) {
      openedFilePath = file;
      copiedFilePath = copyToNotes(file);
    }
    createWindow();
    app.on('activate', () => {
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
