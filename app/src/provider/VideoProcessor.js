const path = require('path');
const log = require('electron-log');
const {app} = require('electron').remote;
const {remote} = require('electron');
const {spawn, execFile, exec} = require('child_process');
const Commons = require(path.join(__dirname, '../provider/Commons'));
const fs = require('fs');
const ffmpegPath = require('ffmpeg-static').replace(
    'app.asar',
    'app.asar.unpacked'
);

//Exceptions
const NotConsecutiveChaptersError = require(path.join(__dirname, '../exceptions/NotConsecutiveChaptersError'));

const config = remote.getGlobal('globalConfig');
const exePath = Commons.isDev() ? app.getAppPath() : path.dirname(process.execPath);
const macExePath = path.join(app.getAppPath(), '..', '..');

const exifToolConfigPath = path.join(exePath, 'app', 'bin', 'exiftool.config');
let gyroProcessPath = undefined;
let exiftool = undefined;

switch (remote.getGlobal('platform')) {
    case 'darwin':
        gyroProcessPath = Commons.isDev() ? path.join(exePath, 'app', 'bin', 'mac', 'udtacopy') : path.join(macExePath, 'app', 'bin', 'mac', 'udtacopy');
        exiftool = Commons.isDev() ? path.join(exePath, 'app', 'bin', 'mac', 'exiftool', 'exiftool') : path.join(macExePath, 'app', 'bin', 'mac', 'exiftool', 'exiftool');

        //Give execution permissions to utilities
        fs.chmodSync(gyroProcessPath, 0o755);
        fs.chmodSync(exiftool, 0o755);
        break;
    case 'win32':
        gyroProcessPath = path.join(exePath, 'app', 'bin', 'win', 'udtacopy.exe');
        exiftool = path.join(exePath, 'app', 'bin', 'win', 'exiftool.exe');
        break;
}

const ProgressBar = require(path.join(__dirname, '../components/ProgressBar'));
const Alert = require(path.join(__dirname, '../components/Alert'));

class VideoProcessor {
    statusElem = document.getElementById('status');
    selectFileBtn = document.getElementById('selectFiles');
    processVideosBtn = document.getElementById('processVideos');
    progressBar = new ProgressBar(document.getElementById('progressBar'));

    //FFmpeg errors
    ffmpegNoSpaceLeftError = 'No space left on device';
    ffmpegNoMap3 = 'Stream map \'0:3\' matches no streams.';

    //Flags
    ffmpegBreak = false
    udtacopyBreak = false

    /**
     * Function to process all video files
     *
     * @param filePaths array of video files paths
     */
    startProcessing(filePaths) {
        //Calculate log path and filename
        let now = new Date();
        let logName = (Commons.dateToStr(now) + '.log').replace(':', '-');
        let logPathBase = remote.getGlobal('globalLogPathBase');
        let logPath = path.join(logPathBase, logName);

        log.transports.file.resolvePath = () => logPath;

        log.info('config: ' + JSON.stringify(config));
        log.info('exePath: ' + exePath);
        log.info('gyroProcessPath: ' + gyroProcessPath);
        log.info('exiftool: ' + exiftool);
        log.info('exiftool config: ' + exifToolConfigPath);

        this.selectFileBtn.setAttribute('disabled', 'disabled');
        this.processVideosBtn.setAttribute('disabled', 'disabled');

        this.progressBar.color = ProgressBar.COLOR_ORANGE;
        this.progressBar.maximum = 100;
        this.progressBar.value = 0;

        log.debug('## Starting video processing');
        log.debug('FilePaths: ' + filePaths.join(', '));

        filePaths = filePaths.sort();

        log.debug('FilePaths sorted: ' + filePaths.join(', '));

        log.debug('Starting getModifiedDate');
        this.getModifiedDate(filePaths[0]).then((value) => {
            log.debug('ModifiedDate: ' + value)
            //Here date format is "dd:mm:YYYY HH:MM:SS", need to convert date part to "dd/mm/YYYY HH:MM:SS" (or whatever locale is used)
            let dateParts = value.split(' ');
            dateParts[0] = dateParts[0].replaceAll(':', '/');
            let modifiedDate = new Date(dateParts.join(' '));
            let projectDir = Commons.dateToStr(modifiedDate).replace(':', '-');

            log.debug('ProjectDir: ' + projectDir);

            if (!fs.existsSync(path.join(config.savePath, projectDir))) {
                log.debug('Creating projectDir path');
                fs.mkdirSync(path.join(config.savePath, projectDir));
                log.debug('ProjectDir path created');
            }

            log.debug('Calculating output filename');
            //Calculate output video filename
            let outputName = path.parse(filePaths[0]).name + '_joined.mp4';
            if (fs.existsSync(path.join(config.savePath, projectDir, outputName))) {
                let dirFiles = Commons.readDir(path.join(config.savePath, projectDir));
                let maxNumber = 1;
                let fileRegex = /^G[HX]\d{6}_joined(_\d*)?\.(MP4|mp4)/;

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

            log.debug('Output filename is: ' + outputName);
            log.debug('Creating concat.txt file');

            let concatText = '';
            for (let filePath of filePaths) {
                concatText += 'file \'' + filePath + '\'\n';
            }

            log.debug('concat.txt file content:\n' + concatText);

            fs.writeFileSync(path.join(config.savePath, projectDir, 'concat.txt'), concatText, 'utf-8');

            log.debug('concat.txt file created');

            log.debug('Getting getTotalVidDuration');
            this.getTotalVidDuration(filePaths).then(totalDuration => {
                log.debug('Total duration is: ' + totalDuration);
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

                // noinspection JSCheckFunctionSignatures
                let proc = spawn(ffmpegPath, args, {cwd: path.join(config.savePath, projectDir)});

                log.debug('FFmpeg cwd: ' + path.join(config.savePath, projectDir))
                log.debug('FFmpeg proc object: ' + JSON.stringify(proc));

                proc.stderr.setEncoding('utf8')
                proc.stderr.on('data', (data) => {
                    log.debug(data);

                    if (!this.ffmpegBreak && data.includes(this.ffmpegNoSpaceLeftError)) {
                        this.ffmpegBreak = true;
                        let alert = new Alert('Error: ' + this.ffmpegNoSpaceLeftError, Alert.ALERT_DANGER, 0);
                        alert.width = '300px';
                        Alert.appendToContainer(alert.toHTML());

                        log.error(this.ffmpegNoSpaceLeftError);
                    }

                    if (!this.ffmpegBreak && data.includes(this.ffmpegNoMap3)) {
                        this.ffmpegBreak = true;
                        Alert.appendToContainer(new Alert('Error: MP4 file not valid (It\'s not a GoPro File)', Alert.ALERT_DANGER, 5000).toHTML());

                        log.error(this.ffmpegNoMap3);
                    }

                    if (this.ffmpegBreak) {
                        proc.kill();
                        Commons.resetStatus();
                        this.progressBar.color = ProgressBar.COLOR_RED;
                    } else {
                        this.statusElem.innerText = 'Processing videos';
                        this.statusElem.classList.add('loading');
                        let progressValue = this.progressBar.getProgress(data);
                        if (!isNaN(progressValue)) {
                            this.progressBar.value = progressValue;
                        }
                    }
                });

                proc.on('close', () => {
                    Commons.unlinkIfExists(path.join(config.savePath, projectDir, 'concat.txt')) //The file concat.txt is deleted because it's useless for the user
                    log.debug('concat.txt file deleted');

                    if (!this.ffmpegBreak) {
                        log.debug('Starting processing of gyro data');
                        this.processGyro(outputName, projectDir, filePaths[0]);
                    } else {
                        //Remove output video file
                        let invalidFilePath = path.join(config.savePath, projectDir, outputName);
                        Commons.unlinkIfExists(invalidFilePath);

                        //Remove project dir if it's empty
                        let invalidProjectDir = path.join(config.savePath, projectDir);
                        if (fs.existsSync(invalidProjectDir) && !Commons.readDir(invalidProjectDir).length) {
                            fs.rmdirSync(path.join(config.savePath, projectDir));
                        }
                    }
                });
            }).catch((err) => {
                Commons.resetStatus();
                Alert.appendToContainer(new Alert('Unable to get total videos duration times', Alert.ALERT_DANGER, 5000).toHTML());
                log.error(err);
            });
        }).catch((err) => {
            Commons.resetStatus();
            Alert.appendToContainer(new Alert('Unable to get the modification date of the video file', Alert.ALERT_DANGER, 5000).toHTML());
            log.error(err);
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
        // noinspection JSCheckFunctionSignatures
        let proc = spawn(gyroProcessPath, args, {cwd: path.join(config.savePath, projectDir)});

        log.debug('Udtacopy cwd: ' + path.join(config.savePath, projectDir))
        log.debug('Udtacopy proc object: ' + JSON.stringify(proc));

        proc.stderr.on('data', (data) => {
            proc.kill();
            this.udtacopyBreak = true;
            log.error('Udtacopy stderr data: ' + data);
        });

        proc.stdout.on('data', (data) => {
            log.debug('Udtacopy stdout data: ' + data);
        });

        proc.on('close', () => {
            log.debug('Udtacopy processing finished');

            //Checks if udtacopy throws error
            if (!this.udtacopyBreak) {
                log.debug('Starting metadata file editing');
                this.setCustomMetadata(firstVideo, path.join(config.savePath, projectDir, outputName), projectDir);
            } else {
                this.progressBar.color = ProgressBar.COLOR_RED;
                Alert.appendToContainer(new Alert('Gyro data could not be processed', Alert.ALERT_DANGER, 0).toHTML());
                Commons.unlinkIfExists(path.join(config.savePath, projectDir, outputName)); //Remove not completed output video file

                //Remove project dir if it's empty
                let invalidProjectDir = path.join(config.savePath, projectDir);
                if (fs.existsSync(invalidProjectDir) && !Commons.readDir(invalidProjectDir).length) {
                    fs.rmdirSync(path.join(config.savePath, projectDir));
                }

                Commons.resetStatus();
            }
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
            // noinspection JSCheckFunctionSignatures
            execFile(exiftool, ['-config', exifToolConfigPath, '-s', '-s', '-s', '-time:FileModifyDate', firstVideo], (error, stdout, stderr) => {
                error ? reject({'error': error, 'stderr': stderr}) : resolve(stdout);
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
        log.debug('Getting modifiedDate and persisting into the output file');
        this.getModifiedDate(firstVideo).then((date) => {
            // noinspection JSCheckFunctionSignatures
            execFile(exiftool, [
                '-config',
                exifToolConfigPath,
                '-FileModifyDate="' + date + '"',
                outputVideo
            ], () => {
                log.debug('modifiedDate persisted into the output file');
                this.progressBar.color = ProgressBar.COLOR_GREEN;
                this.statusElem.innerHTML = 'Finished! (<a href="javascript:void(0);" class="openPath" data-path="' + projectDir + '">Open in explorer</a>)';
                this.statusElem.classList.add('text-success');
                this.statusElem.classList.remove('loading');
                this.selectFileBtn.removeAttribute('disabled');

                log.debug('Finished and reloading latest projects');
                Commons.loadLatestProjects();
            });
        }).catch((err) => {
            throw err;
        });
    }

    /**
     * Function that get total duration of all selected files
     *
     * @param videoFiles
     * @returns {Promise<number>}
     */
    getTotalVidDuration(videoFiles) {
        let promises = [];
        for (let vidFile of videoFiles) {
            let prom = new Promise(function (resolve, reject) {
                let cmd = '"' + ffmpegPath + '" -i "' + vidFile + '"';
                exec(cmd, function (error, stdout, stderr) {
                    if (stderr.includes('Duration:')) {
                        //Here can't handle exceptions easily because output is really an error :D
                        let output = stderr.substr(stderr.indexOf('Duration:') + 9, stderr.length);
                        let duration = output.substr(0, output.indexOf(','));
                        log.debug('Duration (' + vidFile + '): ' + duration);
                        resolve(duration);
                    } else {
                        reject({'error': error, 'stderr': stderr});
                    }
                });
            });

            promises.push(prom);
        }

        return Promise.all(promises).then((values) => {
            let secs = 0;

            for (let time of values) {
                let parsedTime = time.trim().replace('\r\n', '').split(':');
                secs += parsedTime[0] * 3600;
                secs += parsedTime[1] * 60;
                secs += parseInt(parsedTime[2]);
            }

            log.debug('Final video duration: ' + secs + ' seconds.');

            return secs;
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
            if (/^G[HX]\d{6}\.(MP4|mp4)/.test(file)) {
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
                    throw new NotConsecutiveChaptersError('Group (' + key + ') have not consecutive chapters');
                } else {
                    lastChapterNum++;
                }
            }
        }

        return goProGroupedFiles;
    }
}

module.exports = VideoProcessor;
