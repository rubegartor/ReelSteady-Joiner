const path = require('path');
const os = require('os');

global.globalLogPathBase = undefined;

switch (os.platform()) {
    case 'win32':
        globalLogPathBase = path.join(os.homedir(), 'AppData', 'Local', 'ReelSteady Joiner', 'logs');
        break;
    case 'darwin':
        globalLogPathBase = path.join(os.homedir(), '.reelsteady-joiner', 'logs');
        break;
}

require('./src/provider/Unhandled')(globalLogPathBase);

const {shell, ipcMain, app, dialog} = require('electron');
const fs = require('fs');
const pLimit = require('p-limit');

const {Config} = require('./src/provider/Config');
global.config = new Config();
config.loadConfig();

global.projects = [];

const Commons = require('./src/provider/Commons');
const VideoProcessor = require('./src/provider/VideoProcessor');
const Project = require('./src/entity/Project');
const ConfigSaveError = require('./src/exceptions/ConfigSaveError');

global.locale = app.getLocale();

if (!fs.existsSync(globalLogPathBase)) {
    fs.mkdirSync(globalLogPathBase, {recursive: true});
}


ipcMain.on('errorInWindow', function (event, data) {
    if (!Commons.isDev() && !data.toString().includes('Uncaught EvalError: Possible side-effect in debug-evaluate')) {
        throw data;
    }
});

// Checks if configPath exists
if (!fs.existsSync(config.savePath)) {
    config.savePath = path.join(app.getPath('documents'), 'ReelSteady Joiner');
    config.saveConfig();
}

// Checks if documents path for saving projects exists
if (!fs.existsSync(path.join(config.savePath))) {
    fs.mkdirSync(path.join(config.savePath));
}

// Events
ipcMain.on('getConfig', (event) => {
    event.returnValue = config;
});

ipcMain.on('updateConfig', (event, args) => {
    try {
        config[args.key] = args.value;
        config.saveConfig();
    } catch (e) {
        if (e instanceof ConfigSaveError) {
            event.sender.send('spawnNotification', {
                'message': e.toString(),
                'type': 'danger',
                'width': 350,
                'timeout': 5000
            });
        } else {
            throw e;
        }
    }
});

ipcMain.on('getLocale', (event) => {
    event.returnValue = locale;
});

ipcMain.on('getLogPathBase', (event) => {
    event.returnValue = globalLogPathBase;
});

ipcMain.on('closeApp', () => {
    app.quit();
});

ipcMain.on('getProjects', (event) => {
    let clonedProjects = Commons.deepClone(projects);
    clonedProjects.map((p) => { p._log = undefined });

    event.returnValue = clonedProjects;
});

ipcMain.on('getProject', (event, args) => {
    let clonedProjects = Commons.deepClone(projects);
    clonedProjects.map((p) => { p._log = undefined });

    event.returnValue = clonedProjects.find(x => x._id === args.id);
});

ipcMain.on('createProject', (event, args) => {
    // Complete projects failed
    for (const project of projects) {
        if (project.failed) {
            project.completed = true;
        }
    }

    for (const projectToRemove of projects.filter(p => p.completed)) {
        event.sender.send('removeCompletedProject', {'id': projectToRemove.id});
    }

    global.projects = projects.filter(p => !p.completed);

    const project = new Project(args.dirPath, args.files);
    projects.push(project);

    event.sender.send('createProjectReturn', {'project': project});
});

ipcMain.on('openLogsPath', () => {
    shell.openPath(globalLogPathBase).then();
});

ipcMain.on('openExternal', (event, args) => {
    shell.openExternal(args).then();
});

ipcMain.on('showLogsPathDialog', (event) => {
    dialog.showOpenDialog({
        properties: ['openDirectory']
    }).then((result) => {
        if (result.filePaths.length > 0) {
            config.savePath = result.filePaths[0];
            try {
                config.saveConfig();
            } catch (e) {
                if (e instanceof ConfigSaveError) {
                    event.sender.send('spawnNotification', {
                        'message': e.toString(),
                        'type': 'danger',
                        'width': 350,
                        'timeout': 5000
                    });
                } else {
                    throw e;
                }
            }
            event.sender.send('showLogsPathDialogReturn', {'savePath': config.savePath});
        }
    });
});

ipcMain.on('showSelectFilesDialog', (event) => {
    dialog.showOpenDialog({
        properties: ['openDirectory']
    }).then((result) => {
        if (result.filePaths.length !== 0) {
            event.sender.send('showSelectFilesDialogReturn', result.filePaths[0]);
        }
    });
});

ipcMain.on('scanGoProDir', (event, args) => {
    try {
        event.returnValue = VideoProcessor.scanGoProDir(args.dirPath);
    } catch (e) {
        event.returnValue = [];
        event.sender.send('spawnNotification', {
            'message': e.toString(),
            'type': 'danger',
            'width': 350,
            'timeout': 5000
        });
    }
});

ipcMain.on('getThumbnail', (event, args) => {
    const project = projects.find(x => x.id === args.id);

    VideoProcessor.getThumbnail(path.join(project.dirPath, project.files[0]), project.id).then((path) => {
        event.sender.send('getThumbnailReturn', {'id': project.id, 'path': path});
    });
});

ipcMain.on('removeProject', (event, args) => {
    projects.find(x => x.id === args.id).remove();
});

ipcMain.on('updateProjectName', (event, args) => {
    projects.find(x => x.id === args.id).name = args.name;
});

ipcMain.on('processVideos', (event) => {
    const limit = pLimit(config.concurrentProjects);

    const input = projects
        .filter(p => !p.failed)
        .filter(p => !p.completed)
        .map((p) => {
            event.sender.send('processVideosStarting');
            return limit(() => VideoProcessor.startProcessing(p, event).catch((e) => {
                event.sender.send('updateProjectFailed', {'id': p.id});
                Commons.unlinkIfExists(path.join(p.projectPath, p.outputName));
                throw e;
            }));
        });

    Promise.all(input).then(() => {
        event.sender.send('processVideosFinished');
    });

    event.sender.send('processVideosStarted');
});
