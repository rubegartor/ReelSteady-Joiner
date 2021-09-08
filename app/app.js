const {dialog, getCurrentWindow} = require('electron').remote;
const {shell, remote} = require('electron');
const fs = require('fs');
const path = require('path');

//Application modules
const Commons = require(path.join(__dirname, '../src/provider/Commons'));
const VideoProvider = require(path.join(__dirname, '../src/provider/VideoProcessor'));

// Javascript interface elements
const statusElem = document.getElementById('status');
const selectFileBtn = document.getElementById('selectFiles');
const processVideosBtn = document.getElementById('processVideos');
const closeWindowBtn = document.getElementById('closeWindow');

// Checks if documents path for saving projects exists
if (!fs.existsSync(path.join(Commons.documentsPath))) {
    fs.mkdirSync(path.join(Commons.documentsPath));
}

// Check for new updates when starting the application
Commons.checkForUpdates();

let config = remote.getGlobal('globalConfig');

// Load list of 4 latest projects
Commons.loadLatestProjects();

closeWindowBtn.addEventListener('click', () => {
    getCurrentWindow().close();
})

let videoFiles = [];

selectFileBtn.addEventListener('click', () => {
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
});


processVideosBtn.addEventListener('click', () => {
    selectFileBtn.setAttribute('disabled', 'disabled');
    const videoProvider = new VideoProvider;
    videoProvider.startProcessing(videoFiles);
    videoFiles = [];
});

document.addEventListener('click', (event) => {
    let invalidTags = ['path', 'svg'];
    if (invalidTags.includes(event.target.tagName)) {
        return;
    }

    if (event.target.className.includes('openPath')) {
        event.preventDefault();
        shell.openPath(path.join(Commons.documentsPath, event.target.dataset.path));
    }

    if (event.target.className.includes('openExternal')) {
        event.preventDefault();
        shell.openExternal(event.target.getAttribute('href'))
    }
});
