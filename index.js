const {app, BrowserWindow} = require('electron')
const os = require('os')
const path = require('path');

const iconPath = path.join(__dirname, 'app', 'assets', 'images', 'icon.png')

if (os.platform() === 'darwin') {
    app.dock.setIcon(iconPath)
}

function createWindow() {
    const win = new BrowserWindow({
        width: 960,
        height: 600,
        frame: false,
        icon: iconPath,
        minWidth: 960,
        minHeight: 600,
        title: 'ReelSteady Joiner',
        resizable: false,
        autoHideMenuBar: true,
        center: true,
        darkTheme: true,
        maximizable: false,
        fullscreenable: false,
        titleBarStyle: 'hiddenInset',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    let templateFile = undefined
    switch (os.platform()) {
        case 'win32':
            templateFile = 'app/templates/index-win.html'
            break
        case 'darwin':
            templateFile = 'app/templates/index-mac.html'
            break
    }

    if (templateFile === undefined) {
        throw new Error('OS not supported')
    }

    // noinspection JSIgnoredPromiseFromCall
    win.loadFile(templateFile)
}

app.whenReady().then(() => {
    createWindow()
    require('./app/app')
})

app.on('window-all-closed', function () {
    app.quit()
})
