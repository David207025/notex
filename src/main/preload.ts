/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = 'ipc-example';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
  saveShapes: (json: string, file: string) =>
    ipcRenderer.invoke('save-shapes', json, file),
  loadShapes: (file: string) => ipcRenderer.invoke('load-shapes', file),
  readDirectory: (directory: string) =>
    ipcRenderer.invoke('read-directory', directory),
  createFolder: (path: string, name: string) =>
    ipcRenderer.invoke('create-folder', path, name),
  createFile: (path: string, name: string) =>
    ipcRenderer.invoke('create-file', path, name),
  deletePath: (path: string) => ipcRenderer.invoke('delete-path', path),
  renamePath: (oldPath: string, newName: string) =>
    ipcRenderer.invoke('rename-path', oldPath, newName),
  getResourcePath: () => ipcRenderer.invoke('getResourcePath'),
  setSnapshot: (snapshot: any) => ipcRenderer.invoke('set-snapshot', snapshot),
  getSnapshot: () => ipcRenderer.invoke('get-snapshot'),
  getOpenedFile: () => ipcRenderer.invoke('getOpenedFile'),
  getFolderTree: (path: string) => ipcRenderer.invoke('getFolderTree', path),
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
