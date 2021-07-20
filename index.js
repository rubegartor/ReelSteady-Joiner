const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow () {
    const win = new BrowserWindow({
        width: 960,
        height: 600,
        frame: false,
        icon: path.join(__dirname, 'app', 'assets', 'images', 'icon.png'),
        'minHeight': 600,
        'minWidth': 720,
        title: 'ReelSteady Joiner',
        resizable: false,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    })

    win.loadFile('app/templates/index.html')
}

app.whenReady().then(() => {
    createWindow()
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})
