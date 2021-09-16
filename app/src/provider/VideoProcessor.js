const path = require('path');
const {app} = require('electron').remote;
const {remote} = require('electron');
const {spawn, execFile} = require('child_process');
const Commons = require(path.join(__dirname, '../provider/Commons'));
const fs = require('fs');
const ffmpegPath = require('ffmpeg-static').replace(
    'app.asar',
    'app.asar.unpacked'
);

const config = remote.getGlobal('globalConfig');
const exePath = Commons.isDev() ? app.getAppPath() : path.dirname(process.execPath);
const gyroProcessPath = Commons.isDev() ? path.join(exePath, 'app', 'utils', 'udtacopy.exe') : path.join(exePath, 'resources', 'app', 'utils', 'udtacopy.exe');
const exiftool = Commons.isDev() ? path.join(exePath, 'app', 'utils', 'exiftool.exe') : path.join(exePath, 'resources', 'app', 'utils', 'exiftool.exe');

const ProgressBar = require(path.join(__dirname, '../components/ProgressBar'));

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

        filePaths = filePaths.sort();

        this.getModifiedDate(filePaths[0]).then((value) => {
            //Here date format is "dd:mm:YYYY HH:MM:SS", need to convert date part to "dd/mm/YYYY HH:MM:SS" (or whatever locale is used)
            let dateParts = value.split(' ');
            dateParts[0] = dateParts[0].replaceAll(':', '/');
            let modifiedDate = new Date(dateParts.join(' '));
            let projectDir = Commons.dateToStr(modifiedDate);

            if (!fs.existsSync(path.join(config.savePath, projectDir))) {
                fs.mkdirSync(path.join(config.savePath, projectDir));
            }

            //Calculate output video filename
            let outputName = path.parse(filePaths[0]).name + '_joined.mp4';
            if (fs.existsSync(path.join(config.savePath, projectDir, outputName))) {
                let dirFiles = Commons.readDir(path.join(config.savePath, projectDir));
                let maxNumber = 1;
                let fileRegex = /^G[{(H|X)}]\d{6}_joined(_\d*)?.(MP4|mp4)/;

                for (let file of dirFiles) {
                    if (fileRegex.test(file)) {
                        let splitted = path.parse(file).name.split('_');

                        if (splitted.length > 2 && !isNaN(parseInt(splitted[2])) && typeof parseInt(splitted[2]) === 'number') {
                            if (parseInt(splitted[2]) > maxNumber - 1) {
                                maxNumber = parseInt(splitted[2]) + 1;
                            }
                        }
                    }
                }

                outputName = path.parse(filePaths[0]).name + '_joined_' + maxNumber + '.mp4';
            }

            let concatText = '';
            for (let filePath of filePaths) {
                concatText += 'file \'' + filePath + '\'\n';
            }

            fs.writeFileSync(path.join(config.savePath, projectDir, 'concat.txt'), concatText, 'utf-8');

            this.progressBar.getTotalVidDuration(filePaths).then(totalDuration => {
                this.progressBar.maximum = totalDuration;

                let args = [
                    '-y',
                    '-f', 'concat',
                    '-safe', '0',
                    '-i', path.join(config.savePath, projectDir, 'concat.txt'),
                    '-c', 'copy',
                    '-map', '0:0',
                    '-map', '0:1',
                    '-map', '0:3',
                    outputName
                ];

                let proc = spawn(ffmpegPath, args, {cwd: path.join(config.savePath, projectDir)});

                proc.stderr.setEncoding('utf8')
                proc.stderr.on('data', (data) => {this.statusElem.innerText = 'Processing videos';
                    this.statusElem.classList.add('loading');
                    this.progressBar.value = this.progressBar.getProgress(data);
                });

                proc.on('close', () => {
                    fs.unlinkSync(path.join(config.savePath, projectDir, 'concat.txt')) //The file concat.txt is deleted because it's useless for the user
                    this.processGyro(outputName, projectDir, filePaths[0]);
                });
            });
        });
    }

    /**
     * Function to embed the gyroscope data
     *
     * @param outputName
     * @param projectDir
     * @param firstVideo
     */
    processGyro(outputName, projectDir, firstVideo) {
        let args = [firstVideo, outputName];
        let proc = spawn(gyroProcessPath, args, {cwd: path.join(config.savePath, projectDir)});

        proc.on('close', () => {
            this.setCustomMetadata(firstVideo, path.join(config.savePath, projectDir, outputName), projectDir);
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
                this.statusElem.innerHTML = 'Finished! (<a href="javascript:void(0);" class="openPath" data-path="' + projectDir + '">Open in explorer</a>)';
                this.statusElem.classList.add('text-success');
                this.statusElem.classList.remove('loading');
                this.selectFileBtn.removeAttribute('disabled');

                Commons.loadLatestProjects();
            });
        });
    }

    /**
     * Function that scan directory for chapters
     *
     * @param dirPath
     * @returns {{}}
     */
    static scanGoProDir(dirPath) {
        let goProGroupedFiles = {};
        let goProFiles = [];
        let files = Commons.readDir(dirPath);

        //Get GoPro files
        for (let file of files) {
            if (/^G[{(H|X)}]\d{6}.(MP4|mp4)/.test(file)) {
                goProFiles.push(file);
            }
        }

        //Group chapters
        for (let goProFile of goProFiles) {
            let fileNumber = goProFile.substr(4, 4);

            if (goProGroupedFiles[fileNumber]) {
                goProGroupedFiles[fileNumber].push(goProFile);
            } else {
                goProGroupedFiles[fileNumber] = [goProFile];
            }
        }

        //Sort chapters in groups
        for (const [key, values] of Object.entries(goProGroupedFiles)) {
            goProGroupedFiles[key] = values.sort();
        }

        //Check consecutive chapters in groups
        for (const [key, values] of Object.entries(goProGroupedFiles)) {
            let lastChapterNum = 1;

            for (let chapterFile of values) {
                let chapterNum = chapterFile.substr(2, 2);

                if (parseInt(chapterNum) !== lastChapterNum) {
                    throw new Error('Group (' + key + ') have not consecutive chapters');
                } else {
                    lastChapterNum++;
                }
            }
        }

        return goProGroupedFiles;
    }
}

module.exports = VideoProcessor;
