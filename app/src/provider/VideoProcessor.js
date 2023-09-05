const path = require('path');
const os = require('os');
const fs = require('fs');
const electronLog = require('electron-log');
const {app} = require('electron');
const {spawn, execFile, exec} = require('child_process');
const ffmpegPath = require('ffmpeg-static').replace('app.asar', 'app.asar.unpacked');
const ffmpeg = require('fluent-ffmpeg');
const Commons = require('../provider/Commons');
const ProjectType = require('../entity/ProjectType');

ffmpeg.setFfmpegPath(ffmpegPath);

//Exceptions
const NotConsecutiveChaptersError = require('../exceptions/NotConsecutiveChaptersError');

const exePath = Commons.isDev() ? app.getAppPath() : path.dirname(process.execPath);
const macExePath = path.join(app.getAppPath(), '..', '..');

let exifToolConfigPath = undefined;
let gyroProcessPath = undefined;
let exiftool = undefined;

switch (os.platform()) {
    case 'darwin':
        gyroProcessPath = Commons.isDev() ? path.join(exePath, 'app', 'bin', 'mac', 'udtacopy') : path.join(macExePath, 'app', 'bin', 'mac', 'udtacopy');
        exiftool = Commons.isDev() ? path.join(exePath, 'app', 'bin', 'mac', 'exiftool', 'exiftool') : path.join(macExePath, 'app', 'bin', 'mac', 'exiftool', 'exiftool');
        exifToolConfigPath = Commons.isDev() ? path.join(exePath, 'app', 'bin', 'exiftool.config') : path.join(macExePath, 'app', 'bin', 'exiftool.config');

        //Give execution permissions to utilities
        if (Commons.isDev()) {
            fs.chmodSync(gyroProcessPath, 0o755);
            fs.chmodSync(exiftool, 0o755);
        }
        break;
    case 'win32':
        gyroProcessPath = path.join(exePath, 'app', 'bin', 'win', 'udtacopy.exe');
        exiftool = path.join(exePath, 'app', 'bin', 'win', 'exiftool.exe');
        exifToolConfigPath = path.join(exePath, 'app', 'bin', 'exiftool.config');
        break;
}

class VideoProcessor {
    /**
     * Function to process projects
     *
     * @param project
     * @param event
     */
    static async startProcessing(project, event) {
        this.createLog(project);
        return new Promise((resolve, reject) => {
            const waitFor = (cd, cb) => {
                cd() ? cb() : setTimeout(waitFor.bind(null, cd, cb), 250)
            };

            waitFor(() => {
                return project.available
            }, () => {
                event.sender.send('setMaxProjectProgress', {'id': project.id, 'max': project.duration});
                let projectError = false;

                this.logGeneralInfo(project);
                this.generateProjectDir(project);
                const outputName = this.generateOutputName(project);
                const concatFilePath = this.createConcatFile(project);
                const outputFilePath = path.join(project.projectPath, outputName);
                this.logProjectInfo(project, outputName, concatFilePath, outputFilePath);

                this.getAllStreamMaps(project, concatFilePath).then(streamMaps => {
                    return streamMaps.map((m) => {
                        return `-map 0:${m}`
                    });
                }).catch((e) => {
                    projectError = true;
                    reject(e);
                }).then(maps => {
                    const inputOptions = ['-y', '-f concat', '-safe 0'];
                    let outputOptions = ['-c copy', ...maps, '-ignore_unknown'];

                    if (project.type === ProjectType.PROJECT_360) {
                        outputOptions.push('-c:a aac');
                    }

                    return new Promise((resolve, reject) => {
                        // noinspection JSUnresolvedFunction
                        new ffmpeg(concatFilePath)
                            .on('progress', (progress) => {
                                try {
                                    event.sender.send('updateProjectProgress', {
                                        'id': project.id,
                                        'progress': progress
                                    });
                                } catch (_) {
                                } //Skip error when killing ffmpeg process on application close
                            })
                            .on('error', (err, stdout, stderr) => {
                                reject({'err': err, 'stdout': stdout, 'stderr': stderr});
                            })
                            .on('start', (cmd) => project.log.debug(cmd))
                            .on('stderr', (stderr) => project.log.debug(stderr))
                            .on('end', resolve)
                            .inputOptions(inputOptions)
                            .outputOptions(outputOptions)
                            .save(outputFilePath);
                    }).catch((err) => {
                        projectError = true;
                        reject(err);
                    });
                }).then(() => {
                    if (!projectError) return this.processGyro(outputName, project);
                }).catch((e) => {
                    projectError = true;
                    reject(e);
                }).then(() => {
                    if (!projectError) return this.setCustomMetadata(project, outputFilePath);
                }).catch((e) => {
                    projectError = true;
                    reject(e);
                }).then(() => {
                    if (!projectError) {
                        // Rename output file if project type is 360
                        if (project.type === ProjectType.PROJECT_360) {
                            const outputNameBase = path.basename(outputName, path.extname(outputName))
                            fs.renameSync(outputFilePath, path.join(project.projectPath, outputNameBase + '.' + ProjectType.PROJECT_360));
                        }

                        Commons.unlinkIfExists(concatFilePath);
                        project.completed = true;
                        event.sender.send('updateProjectCompleted', {'id': project.id});
                        resolve();
                    }
                }).catch((e) => {
                    projectError = true;
                    reject(e);
                });
            });
        });
    }

    /**
     * Function that initialize the log
     *
     * @param project
     */
    static createLog(project) {
        const log = electronLog.create(project.id);
        const logName = `${project.name}_${Commons.dateToStr(new Date())}.log`.replace(':', '-');
        const logPathBase = globalLogPathBase;
        log.transports.file.resolvePath = () => path.join(logPathBase, logName);

        project.log = log;
    }

    /**
     * Function that logs general info about RSJoiner paths, etc.
     */
    static logGeneralInfo(project) {
        //Debug info
        project.log.info(`OS: ${os.platform()} - ${os.release()}`);
        project.log.info(`version: ${Commons.version}`);
        project.log.info(`isDev?: ${Commons.isDev()}`);
        project.log.info(`config: ${JSON.stringify(config, null, 2)}`);
        project.log.info(`exePath: ${exePath}`);
        project.log.info(`macExePath: ${macExePath}`);
        project.log.info(`ffmpegPath: ${ffmpegPath}`);
        project.log.info(`gyroProcessPath: ${gyroProcessPath}`);
        project.log.info(`exiftool: ${exiftool}`);
        project.log.info(`exiftool config: ${exifToolConfigPath}`);
    }

    /**
     * Function that logs general info about project
     */
    static logProjectInfo(project, outputName, concatFilePath, outputFilePath) {
        project.log.info(`Project: ${JSON.stringify(project, null, 2)}`);
        project.log.info(`outputName: ${outputName}`);
        project.log.info(`projectPath: ${project.projectPath}`);
        project.log.info(`concatFilePath: ${concatFilePath}`);
        project.log.info(`outputFilePath: ${outputFilePath}`);
        project.log.info('File sizes:');
        for (const filePath of project.filePaths) {
            project.log.info(`${filePath} size: ${Commons.getFileSize(filePath)}B${(project.filePaths.indexOf(filePath) === (project.filePaths.length - 1) ? '\n' : '')}`);
        }
    }

    /**
     * Function to generate project path
     *
     * @param project
     */
    static generateProjectDir(project) {
        switch (config.exportOption) {
            case 0:
                const savePath = path.join(config.savePath, project.name);
                if (!fs.existsSync(savePath)) {
                    fs.mkdirSync(savePath);
                }

                project.projectPath = savePath;
                break;
            case 1:
                project.projectPath = project.dirPath;
                break;
        }
    }

    /**
     * Function that generates output name for the project
     *
     * @param project
     * @returns {string} generated output name
     */
    static generateOutputName(project) {
        let projectFileName = path.parse(project.files[0]).name;
        if (config.exportOption === 0) projectFileName = project.name;

        let outputName = projectFileName + '_joined.mp4';
        if (fs.existsSync(path.join(project.projectPath, outputName))) {
            const dirFiles = Commons.readDir(path.join(project.projectPath));
            const fileRegex = /^G[HXS]\d{6}_joined(_\d*)?\.(MP4|mp4|360)/;
            let maxNumber = 1;

            for (const file of dirFiles) {
                const fileName = path.parse(file).name;
                const checkFileName = fileName.substring(0, 8) === projectFileName.substring(0, 8);

                if (checkFileName && fileRegex.test(file)) {
                    const split = fileName.split('_');

                    if (split.length > 2 && !isNaN(parseInt(split[2])) && typeof parseInt(split[2]) === 'number') {
                        if (parseInt(split[2]) > maxNumber - 1) {
                            maxNumber = parseInt(split[2]) + 1;
                        }
                    }
                }
            }

            outputName = `${projectFileName}_joined_${maxNumber}.mp4`;
        }

        return outputName;
    }

    /**
     * Function that creates concat file and his content
     *
     * @param project
     * @returns {string} concat.txt path file
     */
    static createConcatFile(project) {
        let concatText = '';
        for (const filePath of project.filePaths) {
            concatText += 'file \'' + Commons.scapePath(filePath) + '\'\n';
        }

        project.log.debug(`concat.txt content:\n${concatText}`);

        fs.writeFileSync(path.join(os.tmpdir(), `concat_${project.id}.txt`), concatText, 'utf-8');

        return path.join(os.tmpdir(), `concat_${project.id}.txt`);
    }

    /**
     * Function to embed the gyroscope data
     *
     * @param outputName
     * @param project
     */
    static processGyro(outputName, project) {
        return new Promise((resolve, reject) => {
            const args = [project.filePaths[0], path.join(project.projectPath, outputName)];
            // noinspection JSCheckFunctionSignatures
            const proc = spawn(gyroProcessPath, args);

            project.log.debug(`procesGryro: ${JSON.stringify(proc)}`);

            proc.stderr.on('data', (data) => {
                proc.kill();
                project.log.error(`Udtacopy stderr data: ${data}`);
                reject(data);
            });

            proc.stdout.on('data', (data) => {
                project.log.debug(`Udtacopy stdout data: ${data}`);
            });

            proc.on('close', resolve);
        });
    }

    /**
     * Function that gets the modification date of the given file
     *
     * @param firstVideo
     * @returns {Promise}
     */
    static async getModifiedDate(firstVideo) {
        return new Promise((resolve, reject) => {
            // noinspection JSCheckFunctionSignatures
            execFile(exiftool, ['-config', exifToolConfigPath, '-s', '-s', '-s', '-time:FileModifyDate', firstVideo], (error, stdout, stderr) => {
                error ? reject({'error': error, 'stderr': stderr}) : resolve(stdout.trim().replace('\r\n', ''));
            });
        });
    }

    /**
     * Function that sets the original creation date of the given file to the new output file.
     *
     * @param project
     * @param outputVideo
     */
    static async setCustomMetadata(project, outputVideo) {
        return new Promise(resolve => {
            if (config.fileModifyDates) {
                const exec = execFile(exiftool, [
                    '-config',
                    exifToolConfigPath,
                    `-FileModifyDate="${project.modifiedDate}"`,
                    outputVideo
                ], resolve);

                project.log.debug(`customMetadata: ${JSON.stringify(exec)}`);
            } else {
                resolve();
            }
        });
    }

    /**
     * Function that gets all stream maps available in the project video files
     *
     * @param project
     * @param concatFilePath
     * @returns {Promise<[string]>}
     */
    static async getAllStreamMaps(project, concatFilePath) {
        return new Promise((resolve, reject) => {
            const cmd = `"${ffmpegPath}" -f concat -safe 0 -i ${concatFilePath} -y`;
            exec(cmd, {cwd: project.projectPath}, function (error, stdout, stderr) {
                try {
                    const searchStr = 'Stream #0:';
                    // noinspection JSUnresolvedFunction
                    const streamMaps = [...stderr.matchAll(new RegExp(searchStr, 'gi'))]
                        .map(a => a.input.substring(a.index + searchStr.length, (a.index + searchStr.length) + 1));

                    if (streamMaps.length === 0) reject({'error': 'No stream maps found'});

                    project.log.debug(`Extracted maps: ${streamMaps.join(', ')}`);

                    resolve(streamMaps);
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    /**
     * Function that get total duration of project video files
     *
     * @param project
     * @returns {Promise<number>}
     */
    static async getTotalVidDuration(project) {
        const promises = [];
        for (const vidFile of project.filePaths) {
            const prom = new Promise(function (resolve, reject) {
                exec(`"${ffmpegPath}" -i "${vidFile}"`, (error, stdout, stderr) => {
                    if (stderr.includes('Duration:')) {
                        const output = stderr.substring(stderr.indexOf('Duration:') + 9, stderr.length);
                        const duration = output.substring(0, output.indexOf(','));
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

            for (const time of values) {
                const parsedTime = time.trim().replace('\r\n', '').split(':');
                secs += parsedTime[0] * 3600;
                secs += parsedTime[1] * 60;
                secs += parseInt(parsedTime[2]);
            }

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
        const goProGroupedFiles = {};
        const goProFiles = [];
        const files = Commons.readDir(dirPath);

        //Get GoPro files
        for (const file of files) {
            if (/^G[HXS]\d{6}\.(MP4|mp4|360)/.test(file) && !goProFiles.includes(file)) {
                goProFiles.push(file);
            }
        }

        //Group chapters
        for (const goProFile of goProFiles) {
            const fileNumber = goProFile.substring(4, 8);

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

            for (const chapterFile of values) {
                const chapterNum = chapterFile.substring(2, 4);

                if (parseInt(chapterNum) !== lastChapterNum) {
                    throw new NotConsecutiveChaptersError(`Group (${key}) have not consecutive chapters`);
                } else {
                    lastChapterNum++;
                }
            }
        }

        return goProGroupedFiles;
    }

    /**
     * Function that generates the thumbnail of the project
     *
     * @param filePath
     * @param uuid
     * @returns {Promise<string>} filePath of thumbnail
     */
    static async getThumbnail(filePath, uuid) {
        return new Promise((resolve, reject) => {
            // noinspection JSUnresolvedFunction
            new ffmpeg(filePath)
                .on('end', () => {
                    resolve(path.join(os.tmpdir(), `${uuid}.png`));
                })
                .on('error', function (err, stdout, stderr) {
                    reject({'error': err, 'stdout': stdout, 'stderr': stderr});
                })
                .takeScreenshots({
                    timemarks: ['00:00:00.000'],
                    filename: `${uuid}.png`,
                    folder: os.tmpdir(),
                    size: '320x240'
                });
        });
    }
}

module.exports = VideoProcessor;
