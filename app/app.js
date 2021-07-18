const {dialog, app} = require('electron').remote;
const fs = require('fs');
const path = require('path');
const spawn = require('child_process').spawn;
const ffmpegPath = require('ffmpeg-static').replace(
    'app.asar',
    'app.asar.unpacked'
);

const appPath = path.join(app.getPath('documents'), 'ReelSteady Joiner');
const exePath = isDev() ? app.getAppPath() : path.dirname(process.execPath);

if (!fs.existsSync(path.join(appPath))) {
    fs.mkdirSync(path.join(appPath));
}

document.getElementById('selectFiles').addEventListener('click', function () {
    dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections']
    }).then((result => {
        if (result.filePaths.length !== 0) startProcessing(result.filePaths);
    }));
});

function isDev() {
    return !app.isPackaged
}

function startProcessing(filePaths) {
    document.getElementById('rawProcessData').value = '';
    document.getElementById('status').classList.remove('text-success');
    document.getElementById('status').innerText = 'Waiting files...';
    document.getElementById('selectFiles').setAttribute('disabled', 'disabled');

    let millis = new Date().getTime();

    if (!fs.existsSync(path.join(appPath, millis.toString()))) {
        fs.mkdirSync(path.join(appPath, millis.toString()));
    }

    let concatText = '';

    let filePathsSorted = filePaths.sort();

    for (let filePath of filePathsSorted) {
        concatText += 'file \'' + filePath + '\'\n';
        fs.writeFileSync(path.join(appPath, millis.toString(), 'concat.txt'), concatText, 'utf-8');
    }

    let args = [
        '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', path.join(appPath, millis.toString(), 'concat.txt'),
        '-c', 'copy',
        '-map', '0:0',
        '-map', '0:1',
        '-map', '0:3',
        'output.mp4'
    ];

    let proc = spawn(ffmpegPath, args, {cwd: path.join(appPath, millis.toString())});

    proc.stderr.setEncoding("utf8")
    proc.stderr.on('data', function (data) {
        document.getElementById('status').innerText = 'Processing videos...'
        document.getElementById('rawProcessData').value += data + '\n';
        document.getElementById('rawProcessData').scrollTop = document.getElementById('rawProcessData').scrollHeight;
    });

    proc.on('close', function () {
        processGyro(millis, filePathsSorted);
    });
}

function processGyro(millis, filePathsSorted) {
    document.getElementById('rawProcessData').value += '\nProcessing gyro data...' + '\n';
    document.getElementById('rawProcessData').scrollTop = document.getElementById('rawProcessData').scrollHeight;

    let args = [
        filePathsSorted[0],
        'output.mp4'
    ];

    let gyroProcessPath = isDev() ? path.join(exePath, 'app') + '\\udtacopy.exe' : path.join(exePath, 'resources', 'app') + '\\udtacopy.exe';

    let proc = spawn(gyroProcessPath, args, {cwd: path.join(appPath, millis.toString())});

    proc.on('close', function () {
        document.getElementById('rawProcessData').value += '\n\nFinished!';
        document.getElementById('rawProcessData').scrollTop = document.getElementById('rawProcessData').scrollHeight;
        document.getElementById('status').innerText = 'Finished! (Saved in: Documents/ReelSteady Joiner/' + millis + ')';
        document.getElementById('status').classList.add('text-success');
        document.getElementById('selectFiles').removeAttribute('disabled');
    })
}