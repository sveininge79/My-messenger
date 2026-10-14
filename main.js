const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let win;
let tray;

// Set up settings memory
const configPath = path.join(app.getPath('userData'), 'settings.json');
let config = { autostart: true, minimizeToTray: true };
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath));
}
function saveConfig() {
  fs.writeFileSync(configPath, JSON.stringify(config));
}

// Apply Autostart setting
app.setLoginItemSettings({
  openAtLogin: config.autostart,
  path: app.getPath('exe')
});

function createWindow () {
  win = new BrowserWindow({
    width: 900,
    height: 800,
    autoHideMenuBar: true,
    title: "My Messenger",
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Loads the gear icon script
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadURL('https://www.facebook.com/messages/');

  win.webContents.on('did-finish-load', () => {
    win.webContents.insertCSS(`
      :root { --header-height: 0px !important; }
      body { background-color: #f0f2f5 !important; overflow: hidden !important; }
      div[role="banner"] { display: none !important; }
      div[role="complementary"] { display: none !important; }
      div[role="navigation"] { border-radius: 12px !important; margin: 12px !important; box-shadow: 0 4px 24px rgba(0,0,0,0.1) !important; overflow: hidden !important; }
      div[role="main"] { border-radius: 12px !important; margin: 12px 12px 12px 0 !important; box-shadow: 0 4px 24px rgba(0,0,0,0.1) !important; overflow: hidden !important; }
    `);
  });

  // Handle custom close behavior based on settings
  win.on('close', function (event) {
    if (!app.isQuitting && config.minimizeToTray) {
      event.preventDefault();
      win.hide();
    }
  });
}

// Handle the Gear Icon Click
ipcMain.on('show-settings-menu', () => {
  const template = [
    {
      label: 'Start with Windows',
      type: 'checkbox',
      checked: config.autostart,
      click: (item) => {
        config.autostart = item.checked;
        saveConfig();
        app.setLoginItemSettings({ openAtLogin: config.autostart, path: app.getPath('exe') });
      }
    },
    {
      label: 'Minimize to Tray when closing',
      type: 'checkbox',
      checked: config.minimizeToTray,
      click: (item) => {
        config.minimizeToTray = item.checked;
        saveConfig();
      }
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  menu.popup(win);
});

app.whenReady().then(() => {
  createWindow();

  const iconPath = path.join(__dirname, 'icon.ico');
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Messenger', click: () => win.show() },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
  ]);
  tray.setToolTip('My Messenger');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => win.show());
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});