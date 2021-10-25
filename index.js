const {app, BrowserWindow} = require('electron')
const path = require('path')
const os = require('os')
const fs = require('fs')
const moment = require('moment')

const iconPath = path.join(__dirname, 'app', 'assets', 'images', 'icon.png')
let globalLogPathBase = undefined

switch (os.platform()) {
    case 'win32':
        globalLogPathBase = path.join(os.homedir(), 'AppData', 'Local', 'ReelSteady Joiner', 'logs')
        break
    case 'darwin':
        app.dock.setIcon(iconPath)
        globalLogPathBase = path.join(os.homedir(), '.reelsteady-joiner', 'logs')
        break
}

if (!fs.existsSync(globalLogPathBase)) {
    fs.mkdirSync(globalLogPathBase, {recursive: true})
}

require(path.join(__dirname, 'app/src/provider/Unhandled'))(globalLogPathBase)

const Config = require(path.join(__dirname, 'app/src/provider/Config'))

function createWindow() {
    const win = new BrowserWindow({
        width: 960,
        height: 600,
        frame: false,
        icon: iconPath,
        'minHeight': 600,
        'minWidth': 720,
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
            contextIsolation: false,
            enableRemoteModule: true
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

    let config = new Config()
    config.loadConfig()
    global.globalConfig = config

    global.globalMoment = moment
    global.globalMoment.locale(app.getLocale())

    global.platform = os.platform()
    global.platformRelease = os.release()

    global.globalLogPathBase = globalLogPathBase
})

app.on('window-all-closed', function () {
    app.quit()
})
