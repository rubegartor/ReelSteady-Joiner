const {app, dialog, getCurrentWindow} = require('electron').remote;
const {shell, remote} = require('electron');
const os = require('os');
const fs = require('fs');
const path = require('path');
require(path.join(__dirname, '../src/provider/Unhandled'));

const closeWindowBtn = document.getElementById('closeWindow');
closeWindowBtn.addEventListener('click', () => {
    getCurrentWindow().close();
});

//Application modules
const Commons = require(path.join(__dirname, '../src/provider/Commons'));
const VideoProvider = require(path.join(__dirname, '../src/provider/VideoProcessor'));
const ChapterGroup = require(path.join(__dirname, '../src/components/ChapterGroup'));
const Alert = require(path.join(__dirname, '../src/components/Alert'));

//Exceptions
const NotConsecutiveChaptersError = require(path.join(__dirname, '../src/exceptions/NotConsecutiveChaptersError'));

// Javascript interface elements
const statusElem = document.getElementById('status');
const selectFileBtn = document.getElementById('selectFiles');
const processVideosBtn = document.getElementById('processVideos');
const settingsBtn = document.getElementById('settingsBtn');
const settingsContainer = document.getElementById('settingsWrapper');
const settingsGoBackBtn = document.getElementById('settingsGoBackBtn');
const autoScanWrapper = document.getElementById('autoScanWrapperBg');
const autoScanWrapperCloseBtn = document.getElementById('autoScanWrapperCloseBtn');
const chapterGroupContinueBtn = document.getElementById('chapterGroupContinueBtn');
const autoScanOption = document.getElementById('autoScanOption');
const projectSavePathOption = document.getElementById('projectSavePathOption');
const openLogsPathBtn = document.getElementById('openLogsPathBtn');

// Check for new updates when starting the application
Commons.checkForUpdates();

let config = remote.getGlobal('globalConfig');
if (!fs.existsSync(config.savePath)) {
    config.savePath = path.join(app.getPath('documents'), 'ReelSteady Joiner');
    config.saveConfig();
}
updateConfigDOM();

// Checks if documents path for saving projects exists
if (!fs.existsSync(path.join(config.savePath))) {
    fs.mkdirSync(path.join(config.savePath));
}

// Load list of 4 latest projects
Commons.loadLatestProjects();

let videoFiles = [];

selectFileBtn.addEventListener('click', () => {
    if (!config.autoScan) {
        dialog.showOpenDialog({
            properties: ['openFile', 'multiSelections'],
            filters: [
                {name: 'MP4 Video', extensions: ['mp4']}
            ],
        }).then((result => {
            if (result.filePaths.length !== 0) {
                for (let videoFile of result.filePaths) {
                    if (!videoFiles.includes(videoFile)) {
                        videoFiles.push(videoFile);
                    }
                }

                statusElem.innerText = videoFiles.length + ' videos loaded';
                statusElem.classList.remove('loading');
                processVideosBtn.removeAttribute('disabled');
            } else {
                processVideosBtn.setAttribute('disabled', 'disabled');
                statusElem.innerText = 'Waiting files';
                statusElem.classList.add('loading');
            }

            statusElem.classList.remove('text-success');
        }));
    } else {
        dialog.showOpenDialog({
            properties: ['openDirectory']
        }).then((result) => {
            if (result.filePaths.length !== 0) {
                let dirPath = result.filePaths[0];

                try {
                    let groupContainer = document.getElementById('groupContainer');
                    groupContainer.innerHTML = '';
                    let groups = VideoProvider.scanGoProDir(dirPath);

                    if (Object.keys(groups).length > 0) {
                        for (let [key, videoFiles] of Object.entries(groups)) {
                            let chapterGroup = new ChapterGroup(videoFiles, dirPath);
                            groupContainer.appendChild(chapterGroup.toHTML());
                        }
                    } else {
                        chapterGroupContinueBtn.style.setProperty('display', 'none');
                        groupContainer.appendChild(ChapterGroup.toHTMLEmpty());
                    }

                    autoScanWrapper.style.removeProperty('display');
                } catch (ex) {
                    if (ex instanceof NotConsecutiveChaptersError) {
                        Alert.appendToContainer(new Alert(ex.message, Alert.ALERT_DANGER, 5000).toHTML());
                    } else {
                        throw ex;
                    }
                }
            }
        });
    }
});

processVideosBtn.addEventListener('click', () => {
    selectFileBtn.setAttribute('disabled', 'disabled');
    const videoProvider = new VideoProvider;
    videoProvider.startProcessing(videoFiles);
    videoFiles = [];
});

settingsBtn.addEventListener('click', () => {
    settingsContainer.style.removeProperty('display');
});

settingsGoBackBtn.addEventListener('click', () => {
    settingsContainer.style.setProperty('display', 'none');
});

autoScanOption.addEventListener('change', function () {
    config.autoScan = this.checked;
    config.saveConfig();
});

autoScanWrapperCloseBtn.addEventListener('click', () => {
    chapterGroupContinueBtn.style.setProperty('display', 'none');
    autoScanWrapper.style.setProperty('display', 'none');
});

chapterGroupContinueBtn.addEventListener('click', () => {
    getChapterGroupsToProcess();
});

openLogsPathBtn.addEventListener('click', () => {
    shell.openPath(path.join(os.homedir(), 'AppData', 'Local', 'ReelSteady Joiner', 'logs'));
});

document.getElementById('projectSavePathBtn').addEventListener('click', () => {
    dialog.showOpenDialog({
        properties: ['openDirectory']
    }).then((result) => {
        if (result.filePaths.length > 0) {
            config.savePath = result.filePaths[0];
            config.saveConfig();
            projectSavePathOption.value = config.savePath;

            Commons.loadLatestProjects();
        }
    });
});

document.addEventListener('click', (event) => {
    let invalidTags = ['path', 'svg'];
    if (invalidTags.includes(event.target.tagName)) {
        return;
    }

    if (event.target.className.includes('openPath')) {
        event.preventDefault();
        shell.openPath(path.join(config.savePath, event.target.dataset.path));
    }

    if (event.target.className.includes('openExternal')) {
        event.preventDefault();
        shell.openExternal(event.target.getAttribute('href'));
    }

    if (event.target.name && event.target.name.includes('chapterGroup')) {
        chapterGroupContinueBtn.style.removeProperty('display');
    }
});

/**
 * Get selected chapter group
 */
function getChapterGroupsToProcess() {
    let chapterGroups = document.querySelectorAll("[data-type='chapterGroup']");

    videoFiles = [];

    for (let chapterGroup of chapterGroups) {
        if (chapterGroup.checked) {
            let files = chapterGroup.dataset.files.split(',');
            let dirPath = chapterGroup.dataset.dirPath;

            for (let file of files) {
                videoFiles.push(path.join(dirPath, file));
            }
        }
    }

    statusElem.innerText = videoFiles.length + ' videos loaded';
    statusElem.classList.remove('loading', 'text-success');
    processVideosBtn.removeAttribute('disabled');
    autoScanWrapper.style.setProperty('display', 'none');
}

/**
 * Update config DOM
 */
function updateConfigDOM() {
    autoScanOption.checked = config.autoScan;
    projectSavePathOption.value = config.savePath;
}
