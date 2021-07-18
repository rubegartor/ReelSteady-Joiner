const { app, BrowserWindow } = require('electron')
const path = require('path');
const iconPath = path.join(__dirname, "app", "favicon.ico");

function createWindow () {
    const win = new BrowserWindow({
        width: 960,
        height: 600,
        icon: iconPath,
        'minHeight': 600,
        'minWidth': 720,
        title: 'ReelSteady Joiner',
        resizable: true,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    })

    win.loadFile('app/index.html')
}

app.whenReady().then(() => {
    createWindow()
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})