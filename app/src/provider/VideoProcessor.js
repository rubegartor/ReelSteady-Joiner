const path = require('path');
const os = require('os');
const fs = require('fs');
const log = require('electron-log');
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
        fs.chmodSync(gyroProcessPath, 0o755);
        fs.chmodSync(exiftool, 0o755);
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
        event.sender.send('setMaxProjectProgress', {'id': project.id, 'max': project.duration});
        this.createLog(project);
        return new Promise((resolve, reject) => {
            const waitFor = (cd, cb) => { cd() ? cb() : setTimeout(waitFor.bind(null, cd, cb), 250) };

            waitFor(() => { return project.available }, () => {
                let projectError = false;

                this.logGeneralInfo();
                const outputName = this.generateOutputName(project);
                const projectPath = this.createProjectDir(project);
                const concatFilePath = this.createConcatFile(project);
                const outputFilePath = path.join(projectPath, outputName);
                this.logProjectInfo(project, outputName, projectPath, concatFilePath, outputFilePath);

                this.getAllStreamMaps(projectPath).then(streamMaps => {
                    return streamMaps.map((m) => { return `-map 0:${m}` });
                }).catch((e) => {
                    reject(e);
                }).then(maps => {
                    const inputOptions = ['-y', '-f concat', '-safe 0'];
                    let outputOptions = [ '-c copy', '-c:a aac', ...maps, '-ignore_unknown'];

                    return new Promise((resolve, reject) => {
                        // noinspection JSUnresolvedFunction
                        new ffmpeg(concatFilePath)
                            .on('progress', (progress) => {
                                try {
                                    event.sender.send('updateProjectProgress', {'id': project.id, 'progress': progress});
                                } catch (_) {} //Skip error when killing ffmpeg process on application close
                            })
                            .on('error', (err, stdout, stderr) => {
                                reject({'err': err, 'stdout': stdout, 'stderr': stderr});
                            })
                            .on('start', (cmd) => log.debug(cmd))
                            .on('stderr', (stderr) => log.debug(stderr))
                            .on('end', resolve)
                            .inputOptions(inputOptions)
                            .outputOptions(outputOptions)
                            .save(outputFilePath);
                    }).catch((err) => {
                        projectError = true;
                        reject(err);
                    });
                }).then(() => {
                    if (!projectError) return this.processGyro(outputName, projectPath, project.filePaths[0]);
                }).catch((e) => {
                    projectError = true;
                    reject(e);
                }).then(() => {
                    if (!projectError) return this.setCustomMetadata(project.filePaths[0], outputFilePath);
                }).catch((e) => {
                    projectError = true;
                    reject(e);
                }).then(() => {
                    if (!projectError) {
                        // Rename output file if project type is 360
                        if (project.type === ProjectType.PROJECT_360) {
                            const outputNameBase = path.basename(outputName, path.extname(outputName))
                            fs.renameSync(outputFilePath, path.join(projectPath, outputNameBase + '.' + ProjectType.PROJECT_360));
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
        const logName = `${project.name}_${Commons.dateToStr(new Date())}'.log'`.replace(':', '-');
        const logPathBase = globalLogPathBase;
        log.transports.file.resolvePath = () => path.join(logPathBase, logName);
    }

    /**
     * Function that logs general info about RSJoiner paths, etc.
     */
    static logGeneralInfo() {
        //Debug info
        log.info(`OS: ${os.platform()} - ${os.release()}`);
        log.info(`version: ${Commons.version}`);
        log.info(`isDev?: ${Commons.isDev()}`);
        log.info(`config: ${JSON.stringify(config, null, 2)}`);
        log.info(`exePath: ${exePath}`);
        log.info(`macExePath: ${macExePath}`);
        log.info(`ffmpegPath: ${ffmpegPath}`);
        log.info(`gyroProcessPath: ${gyroProcessPath}`);
        log.info(`exiftool: ${exiftool}`);
        log.info(`exiftool config: ${exifToolConfigPath}`);
    }

    /**
     * Function that logs general info about project
     */
    static logProjectInfo(project, outputName, projectPath, concatFilePath, outputFilePath) {
        log.info(`Project: ${JSON.stringify(project, null, 2)}`);
        log.info(`outputName: ${outputName}`);
        log.info(`projectPath: ${projectPath}`);
        log.info(`concatFilePath: ${concatFilePath}`);
        log.info(`outputFilePath: ${outputFilePath}`);
        log.info('File sizes:');
        for (const filePath of project.filePaths) {
            log.info(`${filePath} size: ${Commons.getFileSize(filePath)}B${(project.filePaths.indexOf(filePath) === (project.filePaths.length - 1) ? '\n' : '')}`);
        }
    }

    /**
     * Function to create project path
     *
     * @param project
     * @returns {string} created project path
     */
    static createProjectDir(project) {
        if (!fs.existsSync(path.join(config.savePath, project.name))) {
            fs.mkdirSync(path.join(config.savePath, project.name));
        }

        return path.join(config.savePath, project.name);
    }

    /**
     * Function that generates output name for the project
     *
     * @param project
     * @returns {string} generated output name
     */
    static generateOutputName(project) {
        let outputName = path.parse(project.files[0]).name + '_joined.mp4';
        if (fs.existsSync(path.join(config.savePath, project.name, outputName))) {
            const dirFiles = Commons.readDir(path.join(config.savePath, project.name));
            const fileRegex = /^G[HXS]\d{6}_joined(_\d*)?\.(MP4|mp4|360)/;
            let maxNumber = 1;

            for (const file of dirFiles) {
                if (fileRegex.test(file)) {
                    const split = path.parse(file).name.split('_');

                    if (split.length > 2 && !isNaN(parseInt(split[2])) && typeof parseInt(split[2]) === 'number') {
                        if (parseInt(split[2]) > maxNumber - 1) {
                            maxNumber = parseInt(split[2]) + 1;
                        }
                    }
                }
            }

            outputName = `${path.parse(project.files[0]).name}_joined_${maxNumber}.mp4`;
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

        log.debug(`concat.txt content:\n${concatText}`);

        fs.writeFileSync(path.join(config.savePath, project.name, 'concat.txt'), concatText, 'utf-8');

        return path.join(config.savePath, project.name, 'concat.txt');
    }

    /**
     * Function to embed the gyroscope data
     *
     * @param outputName
     * @param projectPath
     * @param firstVideo
     */
    static processGyro(outputName, projectPath, firstVideo) {
        return new Promise((resolve, reject) => {
            const args = [firstVideo, outputName];
            // noinspection JSCheckFunctionSignatures
            const proc = spawn(gyroProcessPath, args, {cwd: projectPath});

            log.debug(`procesGryro: ${JSON.stringify(proc)}`);

            proc.stderr.on('data', (data) => {
                proc.kill();
                log.error(`Udtacopy stderr data: ${data}`);
                reject(data);
            });

            proc.stdout.on('data', (data) => {
                log.debug(`Udtacopy stdout data: ${data}`);
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
            const exec = execFile(exiftool, [
                '-config',
                exifToolConfigPath,
                `-FileModifyDate="${project.modifiedDate}"`,
                outputVideo
            ], resolve);

            log.debug(`customMetadata: ${JSON.stringify(exec)}`);
        })
    }

    /**
     * Function that gets all stream maps available in the project video files
     *
     * @param cwdPath
     * @returns {Promise<[string]>}
     */
    static async getAllStreamMaps(cwdPath) {
        return new Promise((resolve, reject) => {
            const cmd = `"${ffmpegPath}" -f concat -safe 0 -i concat.txt -y`;
            exec(cmd, {cwd: cwdPath}, function (error, stdout, stderr) {
                try {
                    const searchStr = 'Stream #0:';
                    // noinspection JSUnresolvedFunction
                    const streamMaps = [...stderr.matchAll(new RegExp(searchStr, 'gi'))]
                        .map(a => a.input.substring(a.index + searchStr.length, (a.index + searchStr.length) + 1));

                    log.debug(`Extracted maps: ${streamMaps.join(', ')}`);

                    resolve(streamMaps);
                } catch (e) {
                    reject({'error': error, 'stderr': stderr});
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
                .on('error', function(err, stdout, stderr) {
                    reject({'error': err, 'stdout': stdout, 'stderr': stderr});
                })
                .takeScreenshots({
                    timemarks: [ '00:00:00.000' ],
                    filename: `${uuid}.png`,
                    folder: os.tmpdir(),
                    size: '320x240'
                });
        });
    }
}

module.exports = VideoProcessor;
