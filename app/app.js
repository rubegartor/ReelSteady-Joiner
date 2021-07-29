const {dialog, app, getCurrentWindow} = require('electron').remote;
const {shell} = require('electron')
const fs = require('fs');
const path = require('path');
const spawn = require('child_process').spawn;
const ffmpegPath = require('ffmpeg-static').replace(
    'app.asar',
    'app.asar.unpacked'
);

const appPath = path.join(app.getPath('documents'), 'ReelSteady Joiner'); //Document path for save processed videos
const exePath = isDev() ? app.getAppPath() : path.dirname(process.execPath);

// Javascript interface elements
const statusElem = document.getElementById('status');
const selectFileBtn = document.getElementById('selectFiles')
const processVideosBtn = document.getElementById('processVideos');
const rawProcessDataElem = document.getElementById('rawProcessData');
const closeWindowBtn = document.getElementById('closeWindow');

if (!fs.existsSync(path.join(appPath))) {
    fs.mkdirSync(path.join(appPath));
}

let videoFiles = [];

closeWindowBtn.addEventListener('click', () => {
    getCurrentWindow().close();
})

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
                    videoFiles.push(videoFile)
                    appendToTextArea('Loaded video file: ' + path.basename(videoFile));
                }
            }


            statusElem.innerText = videoFiles.length + ' videos loaded';
            processVideosBtn.removeAttribute('disabled');
        } else {
            rawProcessDataElem.value = '';
            processVideosBtn.setAttribute('disabled', 'disabled');
            statusElem.innerText = 'Waiting files...';
        }

        statusElem.classList.remove('text-success');
    }));
});

processVideosBtn.addEventListener('click', () => {
    selectFileBtn.setAttribute('disabled', 'disabled');
    startProcessing(videoFiles);
});

document.addEventListener('click', (event) => {
    event.preventDefault();
    let element = event.target;
    if (element.id === 'openPath') {
        let millis = element.dataset.path;

        shell.openPath(path.join(appPath, millis));
    }

    if (element.id === 'openGithub') {
        shell.openExternal(element.getAttribute('href'));
    }
});

/**
 * Function that returns if app is packaged or not
 *
 * @returns {boolean}
 */
function isDev() {
    return !app.isPackaged
}

/**
 * Function for append text into logging textarea
 *
 * @param text
 */
function appendToTextArea(text) {
    rawProcessDataElem.value += text + '\n';
    rawProcessDataElem.scrollTop = rawProcessDataElem.scrollHeight;
}

/**
 * Function to process all video files
 *
 * @param filePaths array of video files paths
 */
function startProcessing(filePaths) {
    rawProcessDataElem.value = '';
    selectFileBtn.setAttribute('disabled', 'disabled');
    processVideosBtn.setAttribute('disabled', 'disabled');

    let actDate = new Date;
    let projectDir = [('0' + actDate.getDate()).slice(-2), ('0' + actDate.getMonth()).slice(-2) + 1, actDate.getFullYear()].join('-')
        + ' ' +
        [('0' + actDate.getHours()).slice(-2), ('0' + actDate.getMinutes()).slice(-2), ('0' + actDate.getSeconds()).slice(-2)].join('_');

    if (!fs.existsSync(path.join(appPath, projectDir.toString()))) {
        fs.mkdirSync(path.join(appPath, projectDir.toString()));
    }

    let concatText = '';
    let filePathsSorted = filePaths.sort();

    for (let filePath of filePathsSorted) {
        concatText += 'file \'' + filePath + '\'\n';
        fs.writeFileSync(path.join(appPath, projectDir.toString(), 'concat.txt'), concatText, 'utf-8');
    }

    let args = [
        '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', path.join(appPath, projectDir.toString(), 'concat.txt'),
        '-c', 'copy',
        '-map', '0:0',
        '-map', '0:1',
        '-map', '0:3',
        'output.mp4'
    ];

    let proc = spawn(ffmpegPath, args, {cwd: path.join(appPath, projectDir.toString())});

    proc.stderr.setEncoding('utf8')
    proc.stderr.on('data', function (data) {
        statusElem.innerText = 'Processing videos...'
        appendToTextArea(data);
    });

    proc.on('close', function () {
        fs.unlinkSync(path.join(appPath, projectDir.toString(), 'concat.txt')) //The file concat.txt is deleted because it is useless for the user
        processGyro(projectDir, filePathsSorted);
    });
}

/**
 * Function to embed the gyroscope data
 *
 * @param projectDir
 * @param filePathsSorted
 */
function processGyro(projectDir, filePathsSorted) {
    appendToTextArea('Processing gyro data...');

    let args = [
        filePathsSorted[0],
        'output.mp4'
    ];

    let gyroProcessPath = isDev() ? path.join(exePath, 'app', 'utils') + '\\udtacopy.exe' : path.join(exePath, 'resources', 'app', 'utils') + '\\udtacopy.exe';
    let proc = spawn(gyroProcessPath, args, {cwd: path.join(appPath, projectDir.toString())});

    proc.on('close', function () {
        videoFiles = [];
        appendToTextArea('\nFinished!');
        statusElem.innerHTML = 'Finished! (<a href="javascript:void(0);" id="openPath" data-path="' + projectDir + '">Open in explorer</a>)';
        statusElem.classList.add('text-success');
        selectFileBtn.removeAttribute('disabled');
    });
}
