/* eslint-disable no-console */
import {
  app,
  Menu,
  shell,
  BrowserWindow,
  MenuItemConstructorOptions,
} from 'electron';
import { handleOpenFile } from './main';

interface DarwinMenuItemConstructorOptions extends MenuItemConstructorOptions {
  selector?: string;
  submenu?: DarwinMenuItemConstructorOptions[] | Menu;
}

export default class MenuBuilder {
  mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  buildMenu(): Menu {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
    ) {
      this.setupDevelopmentEnvironment();
    }

    const template =
      process.platform === 'darwin'
        ? this.buildDarwinTemplate()
        : this.buildDefaultTemplate();

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    return menu;
  }

  setupDevelopmentEnvironment(): void {
    this.mainWindow.webContents.on('context-menu', (_, props) => {
      const { x, y } = props;

      Menu.buildFromTemplate([
        {
          label: 'Inspect element',
          click: () => {
            this.mainWindow.webContents.inspectElement(x, y);
          },
        },
      ]).popup({ window: this.mainWindow });
    });
  }

  buildDarwinTemplate(): MenuItemConstructorOptions[] {
    const subMenuAbout: DarwinMenuItemConstructorOptions = {
      label: 'GUI Array Control',
      submenu: [
        {
          label: 'About 3D Array Editor',
          selector: 'orderFrontStandardAboutPanel:',
        },
        { type: 'separator' },
        { label: 'Services', submenu: [] },
        { type: 'separator' },
        {
          label: 'Hide GUIArrayControl',
          accelerator: process.platform === 'darwin' ? 'Command+H' : 'Ctrl+H',
          selector: 'hide:',
        },
        {
          label: 'Hide Others',
          accelerator:
            process.platform === 'darwin' ? 'Command+Shift+H' : 'Ctrl+Shift+H',
          selector: 'hideOtherApplications:',
        },
        { label: 'Show All', selector: 'unhideAllApplications:' },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Command+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    };
    const subMenuFile: DarwinMenuItemConstructorOptions = {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: process.platform === 'darwin' ? 'Command+N' : 'Ctrl+N',
          click: () => {
            this.mainWindow.webContents.send('request-new-file');
          },
        },
        {
          label: 'Open',
          accelerator: process.platform === 'darwin' ? 'Command+O' : 'Ctrl+O',
          click: handleOpenFile(this.mainWindow),
        },
        {
          label: 'Save',
          accelerator: process.platform === 'darwin' ? 'Command+S' : 'Ctrl+S',
          click: () => {
            this.mainWindow.webContents.send('request-save-file', false);
          },
        },
        {
          label: 'Save As',
          accelerator:
            process.platform === 'darwin' ? 'Command+Shift+S' : 'Ctrl+Shift+S',
          click: () => {
            this.mainWindow.webContents.send('request-save-file', true);
          },
        },
        { type: 'separator' },
        {
          label: 'Set Program Path',
          accelerator: process.platform === 'darwin' ? 'Command+P' : 'Ctrl+P',
          click: () => {
            this.mainWindow.webContents.send('request-set-program-path');
          },
        },
      ],
    };
    const subMenuEdit: DarwinMenuItemConstructorOptions = {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: process.platform === 'darwin' ? 'Command+Z' : 'Ctrl+Z',
          selector: 'undo:',
        },
        {
          label: 'Redo',
          accelerator:
            process.platform === 'darwin' ? 'Shift+Command+Z' : 'Shift+Ctrl+Z',
          selector: 'redo:',
        },
        { type: 'separator' },
        {
          label: 'Cut',
          accelerator: process.platform === 'darwin' ? 'Command+X' : 'Ctrl+X',
          click: () => {
            this.mainWindow.webContents.send('request-copy', true);
          },
        },
        {
          label: 'Copy',
          accelerator: process.platform === 'darwin' ? 'Command+C' : 'Ctrl+C',
          click: () => {
            this.mainWindow.webContents.send('request-copy', false);
          },
        },
        {
          label: 'Paste',
          accelerator: process.platform === 'darwin' ? 'Command+V' : 'Ctrl+V',
          click: () => {
            this.mainWindow.webContents.send('request-paste', false);
          },
        },
        {
          label: 'Select All',
          accelerator: process.platform === 'darwin' ? 'Command+A' : 'Ctrl+A',
          selector: 'selectAll:',
        },
      ],
    };
    const subMenuViewDev: MenuItemConstructorOptions = {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: process.platform === 'darwin' ? 'Command+R' : 'Ctrl+R',
          click: () => {
            this.mainWindow.webContents.reload();
          },
        },
        {
          label: 'Toggle Full Screen',
          accelerator:
            process.platform === 'darwin' ? 'Ctrl+Command+F' : 'Ctrl+F',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
          },
        },
        {
          label: 'Toggle Developer Tools',
          accelerator:
            process.platform === 'darwin' ? 'Alt+Command+I' : 'Alt+Ctrl+I',
          click: () => {
            this.mainWindow.webContents.toggleDevTools();
          },
        },
      ],
    };
    const subMenuViewProd: MenuItemConstructorOptions = {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Full Screen',
          accelerator:
            process.platform === 'darwin' ? 'Ctrl+Command+F' : 'Ctrl+F',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
          },
        },
      ],
    };
    const subMenuWindow: DarwinMenuItemConstructorOptions = {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: process.platform === 'darwin' ? 'Command+M' : 'Ctrl+M',
          selector: 'performMiniaturize:',
        },
        {
          label: 'Close',
          accelerator: process.platform === 'darwin' ? 'Command+W' : 'Ctrl+W',
          selector: 'performClose:',
        },
        { type: 'separator' },
        { label: 'Bring All to Front', selector: 'arrangeInFront:' },
      ],
    };
    const subMenuHelp: MenuItemConstructorOptions = {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click() {
            shell.openExternal('https://electronjs.org');
          },
        },
        {
          label: 'Documentation',
          click() {
            shell.openExternal(
              'https://github.com/electron/electron/tree/main/docs#readme',
            );
          },
        },
        {
          label: 'Community Discussions',
          click() {
            shell.openExternal('https://www.electronjs.org/community');
          },
        },
        {
          label: 'Search Issues',
          click() {
            shell.openExternal('https://github.com/electron/electron/issues');
          },
        },
      ],
    };

    const subMenuView =
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
        ? subMenuViewDev
        : subMenuViewProd;

    return [
      subMenuAbout,
      subMenuFile,
      subMenuEdit,
      subMenuView,
      subMenuWindow,
      subMenuHelp,
    ];
  }

  buildDefaultTemplate() {
    const templateDefault = [
      {
        label: '&File',
        submenu: [
          {
            label: '&New',
            accelerator: 'Ctrl+N',
            click: () => {
              this.mainWindow.webContents.send('request-new-file');
            },
          },
          {
            label: '&Open',
            accelerator: 'Ctrl+O',
            click: handleOpenFile(this.mainWindow),
          },
          {
            label: '&Save',
            accelerator: 'Ctrl+S',
            click: () => {
              this.mainWindow.webContents.send('request-save-file', false);
            },
          },
          {
            label: 'Save &As',
            accelerator: 'Ctrl+Shift+S',
            click: () => {
              this.mainWindow.webContents.send('request-save-file', true);
            },
          },
          { type: 'separator' },
          {
            label: '&Close',
            accelerator: 'Ctrl+W',
            click: () => {
              this.mainWindow.close();
            },
          },
          { type: 'separator' },
          {
            label: 'Set &Program Path',
            accelerator: 'Ctrl+P',
            click: () => {
              this.mainWindow.webContents.send('request-set-program-path');
            },
          },
        ],
      },
      {
        label: '&Edit',
        submenu: [
          {
            label: '&Undo',
            accelerator: 'Ctrl+Z',
            role: 'undo',
          },
          {
            label: '&Redo',
            accelerator: 'Ctrl+Y',
            role: 'redo',
          },
          { type: 'separator' },
          {
            label: 'Cu&t',
            accelerator: 'Ctrl+X',
            click: () => {
              this.mainWindow.webContents.send('request-copy', true);
            },
          },
          {
            label: '&Copy',
            accelerator: 'Ctrl+C',
            click: () => {
              this.mainWindow.webContents.send('request-copy', false);
            },
          },
          {
            label: '&Paste',
            accelerator: 'Ctrl+V',
            click: () => {
              this.mainWindow.webContents.send('request-paste', false);
            },
          },
          { type: 'separator' },
          {
            label: 'Select &All',
            accelerator: 'Ctrl+A',
            role: 'selectAll',
          },
        ],
      },
      {
        label: '&View',
        submenu:
          process.env.NODE_ENV === 'development' ||
          process.env.DEBUG_PROD === 'true'
            ? [
                {
                  label: '&Reload',
                  accelerator: 'Ctrl+R',
                  click: () => {
                    this.mainWindow.webContents.reload();
                  },
                },
                {
                  label: 'Toggle &Full Screen',
                  accelerator: 'F11',
                  click: () => {
                    this.mainWindow.setFullScreen(
                      !this.mainWindow.isFullScreen(),
                    );
                  },
                },
                {
                  label: 'Toggle &Developer Tools',
                  accelerator: 'Alt+Ctrl+I',
                  click: () => {
                    this.mainWindow.webContents.toggleDevTools();
                  },
                },
              ]
            : [
                {
                  label: 'Toggle &Full Screen',
                  accelerator: 'F11',
                  click: () => {
                    this.mainWindow.setFullScreen(
                      !this.mainWindow.isFullScreen(),
                    );
                  },
                },
              ],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Learn More',
            click() {
              shell.openExternal('https://electronjs.org');
            },
          },
          {
            label: 'Documentation',
            click() {
              shell.openExternal(
                'https://github.com/electron/electron/tree/main/docs#readme',
              );
            },
          },
          {
            label: 'Community Discussions',
            click() {
              shell.openExternal('https://www.electronjs.org/community');
            },
          },
          {
            label: 'Search Issues',
            click() {
              shell.openExternal('https://github.com/electron/electron/issues');
            },
          },
        ],
      },
    ];

    return templateDefault;
  }
}
