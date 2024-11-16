// Disable no-unused-vars, broken for spread args
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
};

contextBridge.exposeInMainWorld('electron', {
  electronHandler,
});

contextBridge.exposeInMainWorld('electronAPI', {
  setTitle: (title: string) => ipcRenderer.send('set-title', title),
  onRequestNewFile: (callback: () => void) =>
    ipcRenderer.on('request-new-file', callback),
  onRequestSaveFile: (callback: (saveAs: boolean) => void) =>
    ipcRenderer.on('request-save-file', (_, saveAs) => callback(saveAs)),
  onOpenFile: (callback: (result: any) => void) =>
    ipcRenderer.on('open-file-result', (_, result) => callback(result)),
  sendDataToMain: (data: number[][][], savDir: string) =>
    ipcRenderer.invoke('send-data-to-main', data, savDir),
  onRequestCopy: (callback: (copy: boolean) => void) =>
    ipcRenderer.on('request-copy', (_, copy) => callback(copy)),
  onRequestPaste: (callback: (paste: boolean) => void) =>
    ipcRenderer.on('request-paste', (_, paste) => callback(paste)),
  removeListener: (channel: string, callback: () => void) =>
    ipcRenderer.removeListener(channel, callback),
  executeProgram: () => ipcRenderer.send('excute-program'),
});

export type ElectronHandler = typeof electronHandler;
