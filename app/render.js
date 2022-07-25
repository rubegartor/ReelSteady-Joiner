const {ipcRenderer} = require('electron');
const os = require('os');
const axios = require('axios');

window.onerror = function(error, url, line) {
    ipcRenderer.send('errorInWindow', new RenderProcessError(error, url, line));
};

const ui = require('../src/commons/ui');
const svg = require('../src/commons/svg');


const NotConsecutiveChaptersError = require('../src/exceptions/NotConsecutiveChaptersError');
const RenderProcessError = require('../src/exceptions/RenderProcessError');

const ChapterGroupRender = require('../src/render/ChapterGroupRender');
const ProjectRender = require('../src/render/ProjectRender');
const AlertRender = require('../src/render/AlertRender');
const Commons = require('../src/provider/Commons');

// Javascript interface elements
const closeWindowBtn = ui.get('closeWindow');
const selectFileBtn = ui.get('selectFiles');
const processVideosBtn = ui.get('processVideos');
const settingsBtn = ui.get('settingsBtn');
const settingsContainer = ui.get('settingsWrapper');
const settingsGoBackBtn = ui.get('settingsGoBackBtn');
const autoScanWrapper = ui.get('autoScanWrapperBg');
const chapterGroupContinueBtn = ui.get('chapterGroupContinueBtn');
const projectSavePathOption = ui.get('projectSavePathOption');
const openLogsPathBtn = ui.get('openLogsPathBtn');
const projectSavePathBtn = ui.get('projectSavePathBtn');
const projectContainer = ui.get('projectContainer');

updateView();
updateConfigDOM();
checkForUpdates();

if (os.platform() === 'win32') {
    ui.onClick(closeWindowBtn, () => {
        ipcRenderer.send('closeApp');
    });
}

ui.onClick(settingsBtn, () => {
    ui.show(settingsContainer);
});

ui.onClick(settingsGoBackBtn, () => {
    ui.hide(settingsContainer);
});

ui.onClick(ui.getWithClass('close-modal'), () => {
    ui.hide(Array.from(ui.getWithClass('modalWrapper')));

    for (const elem of ui.getWithClass('onclose-empty')) {
        Array.from(elem.children).map((c) => c.remove());
    }

    Array.from(ui.getWithClass('onclose-hide')).map((c) => ui.hide(c));
});

ui.onClick(openLogsPathBtn, () => {
    ipcRenderer.send('openLogsPath');
});

ui.onClick(projectSavePathBtn, () => {
    ipcRenderer.send('showLogsPathDialog');
});

ui.onClick(document, (event) => {
    const invalidTags = ['path', 'svg'];
    if (invalidTags.includes(event.target.tagName)) {
        return;
    }

    if (event.target.className.includes('openExternal')) {
        event.preventDefault();
        ipcRenderer.send('openExternal', event.target.getAttribute('href'));
    }

    if (event.target.name && event.target.name.includes('chapterGroup')) {
        const chapterGroups = ui.getWithSelector("[data-type='chapterGroup']");
        let selectedChapterGroups = 0;

        for (const chapterGroup of chapterGroups) {
            if (chapterGroup.checked) selectedChapterGroups++;
        }

        selectedChapterGroups > 0 ? ui.show(chapterGroupContinueBtn) : ui.hide(chapterGroupContinueBtn);
    }
});

ui.onClick(selectFileBtn, () => {
    ipcRenderer.send('showSelectFilesDialog');
});

ui.onClick(chapterGroupContinueBtn, () => {
    getChapterGroupsToProcess();
    ui.hide(chapterGroupContinueBtn);
});

ui.onClick(processVideosBtn, () => {
    ipcRenderer.send('processVideos');
});

/**
 * Get selected chapter group
 */
function getChapterGroupsToProcess() {
    const chapterGroups = ui.getWithSelector("[data-type='chapterGroup']");

    // Remove old projects completed before adding new ones
    for (const project of ipcRenderer.sendSync('getProjects')) {
        if (project.completed) project.remove();
    }

    if (chapterGroups.length > 0) {
        Array.from(ui.getWithClass('empty-item')).map((e) => e.remove());
    }

    for (const chapterGroup of chapterGroups) {
        if (chapterGroup.checked) {
            const files = chapterGroup.dataset.files.split(',');
            const dirPath = chapterGroup.dataset.dirPath;

            new Promise((resolve, _) => {
                ipcRenderer.send('createProject', {'dirPath': dirPath, 'files': files});
            }).then((projectElem) => {
                projectContainer.appendChild(projectElem);
            });
        }
    }

    ui.enable(processVideosBtn);
    ui.hide(autoScanWrapper);
}

ipcRenderer.on('showSelectFilesDialogReturn', (event, args) => {
    try {
        const dirPath = args;
        const groupContainer = ui.get('groupContainer');
        groupContainer.innerHTML = '';
        const groups = ipcRenderer.sendSync('scanGoProDir', {'dirPath': dirPath});

        if (Object.keys(groups).length > 0) {
            let foundFlag = false;

            // noinspection JSUnusedLocalSymbols
            for (const [key, videoFiles] of Object.entries(groups)) {
                if (videoFiles.length > 1) {
                    foundFlag = true;

                    const chapterGroup = new ChapterGroupRender(videoFiles, dirPath);
                    groupContainer.appendChild(chapterGroup.toHTML());
                }
            }

            if (!foundFlag) {
                ui.hide(chapterGroupContinueBtn);
                groupContainer.appendChild(ChapterGroupRender.toHTMLEmpty());
            }
        } else {
            ui.hide(chapterGroupContinueBtn);
            groupContainer.appendChild(ChapterGroupRender.toHTMLEmpty());
        }

        ui.show(autoScanWrapper);
    } catch (ex) {
        if (ex instanceof NotConsecutiveChaptersError) {
            AlertRender.appendToContainer(new AlertRender(ex.message, AlertRender.ALERT_DANGER, 5000).toHTML());
        } else {
            throw ex;
        }
    }
})

ipcRenderer.on('showLogsPathDialogReturn', (event, args) => {
    projectSavePathOption.value = args.savePath;
});

ipcRenderer.on('createProjectReturn', (event, args) => {
    const projectRender = new ProjectRender(args.project);
    projectContainer.appendChild(projectRender.toHTML());
});

ipcRenderer.on('processVideosFinished', () => {
    ui.enable(selectFileBtn);
    ui.enable(projectSavePathBtn);
});

ipcRenderer.on('processVideosStarted', () => {
    ui.disable(selectFileBtn);
    ui.disable(processVideosBtn);
    ui.disable(projectSavePathBtn);
});

ipcRenderer.on('processVideosStarting', () => {
    for (const elemHide of ui.getWithClass('actions-container')) {
        if (!elemHide.classList.contains('failed')) {
            ui.hide(elemHide);
        }
    }

    for (const elemShow of ui.getWithClass('progress-container')) {
        if (!elemShow.classList.contains('failed')) {
            ui.show(elemShow);
        }
    }
});

ipcRenderer.on('setMaxProjectProgress', (event, args) => {
    ui.getWithSelector(`[data-progress-${args.id}]`)[0].setAttribute('max', args.max);
});

ipcRenderer.on('updateProjectProgress', (event, args) => {
    let timeIndex = args.progress.timemark.indexOf('time=');
    let time = args.progress.timemark.trim().substring(timeIndex, 11);
    let parsedTime = time.split(':');
    let secs = 0;

    secs += parsedTime[0] * 3600;
    secs += parsedTime[1] * 60;
    secs += parseInt(parsedTime[2]);

    ui.getWithSelector(`[data-progress-${args.id}]`)[0].setAttribute('value', secs);
});

ipcRenderer.on('updateProjectCompleted', (event, args) => {
    const progressBar = ui.getWithSelector(`[data-progress-${args.id}]`)[0];
    progressBar.classList.remove('progress-orange');
    progressBar.classList.add('progress-green');
});

ipcRenderer.on('updateProjectFailed', (event, args) => {
    const progressBar = ui.getWithSelector(`[data-progress-${args.id}]`)[0];
    progressBar.setAttribute('max', 1);
    progressBar.setAttribute('value', 1);
    progressBar.classList.remove('progress-orange');
    progressBar.classList.remove('progress-green');
    progressBar.classList.add('progress-red');
})

ipcRenderer.on('spawnNotification', (event, args) => {
    let alertType = undefined;
    switch (args.type) {
        case 'danger':
            alertType = AlertRender.ALERT_DANGER;
            break;
        case 'success':
            alertType = AlertRender.ALERT_SUCCESS;
            break;
        case 'info':
            alertType = AlertRender.ALERT_INFO;
            break;
    }

    const alert = new AlertRender(args.message, alertType, args.timeout);
    alert.width = args.width + 'px';

    AlertRender.appendToContainer(alert.toHTML());
});

ipcRenderer.on('removeCompletedProject', (event, args) => {
    ui.getWithSelector(`[data-id="${args.id}"]`)[0].remove();
})

function updateView() {
    ui.get('settingsBtn').innerHTML = svg.getSettings();
    ui.get('settingsGoBackBtn').innerHTML = svg.getBack();
}

/**
 * Update config DOM
 */
function updateConfigDOM() {
    const config = ipcRenderer.sendSync('getConfig');
    projectSavePathOption.value = config.savePath;
}

/**
 * Function that checks if ReelSteady Joiner has new updates
 */
function checkForUpdates() {
    const remotePackageJsonUrl = 'https://raw.githubusercontent.com/rubegartor/ReelSteady-Joiner/master/package.json';
    const githubReleasesPage = 'https://github.com/rubegartor/ReelSteady-Joiner/releases';

    axios.get(remotePackageJsonUrl)
        .then((response) => {
            const repoVersion = response.data.version;

            if (repoVersion !== Commons.version) {
                const alertBody = `Update available, <a href="${githubReleasesPage}" class="openExternal">click for download</a>`;
                const alert = new AlertRender(alertBody, AlertRender.ALERT_INFO, 0);
                alert.width = '315px';
                alert.onRemove = function () {
                    ui.get('updateLink').style.removeProperty('display');
                };

                AlertRender.appendToContainer(alert.toHTML());
            }
        })
        .catch(() => {
            const alert = new AlertRender('Unable to check for available updates', AlertRender.ALERT_DANGER, 5000);
            alert.width = '310px';
            AlertRender.appendToContainer(alert.toHTML());
        })
    ;
}
