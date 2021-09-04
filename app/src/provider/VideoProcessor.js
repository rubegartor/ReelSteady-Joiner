const path = require('path');
const {app} = require('electron').remote;
const {spawn, execFile} = require('child_process');
const Commons = require(path.join(__dirname, '../provider/Commons'));
const fs = require('fs');
const ffmpegPath = require('ffmpeg-static').replace(
    'app.asar',
    'app.asar.unpacked'
);

const exePath = Commons.isDev() ? app.getAppPath() : path.dirname(process.execPath);
const gyroProcessPath = Commons.isDev() ? path.join(exePath, 'app', 'utils', 'udtacopy.exe') : path.join(exePath, 'resources', 'app', 'utils', 'udtacopy.exe');
const exiftool = Commons.isDev() ? path.join(exePath, 'app', 'utils', 'exiftool.exe') : path.join(exePath, 'resources', 'app', 'utils', 'exiftool.exe');

const ProgressBar = require('../components/ProgressBar');

class VideoProcessor {
    statusElem = document.getElementById('status');
    selectFileBtn = document.getElementById('selectFiles');
    processVideosBtn = document.getElementById('processVideos');
    progressBar = new ProgressBar(document.getElementById('progressBar'));

    /**
     * Function to process all video files
     *
     * @param filePaths array of video files paths
     */
    startProcessing(filePaths) {
        this.selectFileBtn.setAttribute('disabled', 'disabled');
        this.processVideosBtn.setAttribute('disabled', 'disabled');

        this.progressBar.color = ProgressBar.COLOR_ORANGE;
        this.progressBar.maximum = 100;
        this.progressBar.value = 0;

        let actDate = new Date;
        //TODO: Maybe make project dir => File modify date metadata??
        let projectDir = [('0' + actDate.getDate()).slice(-2), ('0' + (actDate.getMonth() + 1)).slice(-2), actDate.getFullYear()].join('-')
            + ' ' +
            [('0' + actDate.getHours()).slice(-2), ('0' + actDate.getMinutes()).slice(-2), ('0' + actDate.getSeconds()).slice(-2)].join('_');

        if (!fs.existsSync(path.join(Commons.documentsPath, projectDir.toString()))) {
            fs.mkdirSync(path.join(Commons.documentsPath, projectDir.toString()));
        }

        let concatText = '';
        let filePathsSorted = filePaths.sort();

        for (let filePath of filePathsSorted) {
            concatText += 'file \'' + filePath + '\'\n';
            fs.writeFileSync(path.join(Commons.documentsPath, projectDir.toString(), 'concat.txt'), concatText, 'utf-8');
        }

        this.progressBar.getTotalVidDuration(filePathsSorted).then(totalDuration => {
            this.progressBar.maximum = totalDuration;

            let args = [
                '-y',
                '-f', 'concat',
                '-safe', '0',
                '-i', path.join(Commons.documentsPath, projectDir.toString(), 'concat.txt'),
                '-c', 'copy',
                '-map', '0:0',
                '-map', '0:1',
                '-map', '0:3',
                path.parse(filePathsSorted[0]).name + '_joined.mp4'
            ];

            let proc = spawn(ffmpegPath, args, {cwd: path.join(Commons.documentsPath, projectDir.toString())});

            proc.stderr.setEncoding('utf8')
            proc.stderr.on('data', (data) => {
                this.statusElem.innerText = 'Processing videos';
                this.statusElem.classList.add('loading');

                this.progressBar.value = this.progressBar.getProgress(data);
            });

            proc.on('close', () => {
                fs.unlinkSync(path.join(Commons.documentsPath, projectDir.toString(), 'concat.txt')) //The file concat.txt is deleted because it's useless for the user
                this.processGyro(projectDir, filePathsSorted[0]);
            });
        });
    }

    /**
     * Function to embed the gyroscope data
     *
     * @param projectDir
     * @param firstVideo
     */
    processGyro(projectDir, firstVideo) {
        let args = [
            firstVideo,
            path.parse(firstVideo).name + '_joined.mp4'
        ];

        let proc = spawn(gyroProcessPath, args, {cwd: path.join(Commons.documentsPath, projectDir.toString())});

        proc.on('close', () => {
            this.setCustomMetadata(firstVideo, path.join(Commons.documentsPath, projectDir.toString(), path.parse(firstVideo).name + '_joined.mp4'), projectDir.toString());
        });
    }

    /**
     * Function that gets the modification date of the first selected file
     *
     * @param firstVideo
     * @returns {Promise}
     */
    getModifiedDate(firstVideo) {
        return new Promise((resolve, reject) => {
            execFile(exiftool, ['-s', '-s', '-s', '-time:FileModifyDate', firstVideo], (error, stdout, stderr) => {
                console.log(error);
                console.log(stderr);
                error ? reject(stderr) : resolve(stdout);
            });
        });
    }

    /**
     * Function that sets the original creation date of the first selected file to the new output file.
     *
     * @param firstVideo
     * @param outputVideo
     * @param projectDir
     */
    setCustomMetadata(firstVideo, outputVideo, projectDir) {
        this.getModifiedDate(firstVideo).then((date) => {
            execFile(exiftool, [
                '-FileModifyDate="' + date + '"',
                outputVideo
            ], () => {
                this.progressBar.color = ProgressBar.COLOR_GREEN;
                this.statusElem.innerHTML = 'Finished! (<a href="javascript:void(0);" id="openPath" data-path="' + projectDir + '">Open in explorer</a>)';
                this.statusElem.classList.add('text-success');
                this.statusElem.classList.remove('loading');
                this.selectFileBtn.removeAttribute('disabled');
            });
        });
    }
}

module.exports = VideoProcessor;
