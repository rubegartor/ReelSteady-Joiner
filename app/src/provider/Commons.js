const version = '1.2.2';
const {remote} = require('electron');
const {app} = require('electron').remote;
const rp = require('request-promise');
const path = require('path');
const fs = require('fs');

const ProjectGroup = require(path.join(__dirname, '../components/ProjectGroup'));
const Alert = require(path.join(__dirname, '../components/Alert'));

const remotePackageJsonUrl = 'https://raw.githubusercontent.com/rubegartor/ReelSteady-Joiner/master/package.json';
const githubReleasesPage = 'https://github.com/rubegartor/ReelSteady-Joiner/releases';
const config = remote.getGlobal('globalConfig');
const moment = remote.getGlobal('globalMoment');

module.exports = {
    /**
     * Function that checks if ReelSteady Joiner has new updates
     */
    checkForUpdates: function () {
        rp(remotePackageJsonUrl)
            .then(function (data) {
                let packageJson = JSON.parse(data.toString());
                let repoVersion = packageJson.version;

                if (repoVersion !== version) {
                    let alertBody = 'Update available, <a href="' + githubReleasesPage + '" class="openExternal">click for download</a>';
                    let alert = new Alert(alertBody, Alert.ALERT_INFO, 0);
                    alert.width = '315px';
                    alert.onRemove = function () {
                        document.getElementById('updateLink').style.removeProperty('display');
                    };
                    Alert.appendToContainer(alert.toHTML());
                }
            });
    },

    /**
     * Function that returns if app is packaged or not
     *
     * @returns {boolean}
     */
    isDev: function () {
        return !app.isPackaged;
    },

    /**
     * Function that load list of 4 latest projects
     */
    loadLatestProjects: function () {
        let allProjects = [];

        const lastProjectContainer = document.getElementById('lastProjectContainer');
        lastProjectContainer.innerHTML = '';

        for (let dir of this.getDirectories(config.savePath)) {
            let dirContent = this.readDir(path.join(config.savePath, dir));

            for (let content of dirContent) {
                try {
                    let contentStats = fs.statSync(path.join(config.savePath, dir, content));
                    if (!contentStats.isDirectory()) {
                        let fileRegex = /^G[{(H|X)}]\d{6}_joined(_\d*)?.(MP4|mp4)/;
                        if (['.MP4', '.mp4'].includes(path.extname(content)) && fileRegex.test(content)) {
                            allProjects.push({'dir': dir, 'file': content, 'date': contentStats.mtime});
                        }
                    }
                } catch (e) {
                    //Errors omitted like EPERM, EBUSY, etc.
                }
            }
        }

        //Sort by modify datetime
        allProjects.sort(function (a, b) {
            return a.date - b.date;
        });

        //Sort by number of filename
        allProjects.sort(function (a, b) {
            return parseInt(a.file.split('_')[2]) - parseInt(b.file.split('_')[2]);
        });

        if (!allProjects.length) {
            lastProjectContainer.append(ProjectGroup.toEmptyHTML());
        }

        for (let project of allProjects.reverse().slice(0, 4)) {
            lastProjectContainer.append(new ProjectGroup(project.dir, project.file).toHTML());
        }
    },

    /**
     * Function that gets the directories from given path
     *
     * @param sysPath
     * @returns {string[]}
     */
    getDirectories: function (sysPath) {
        return fs.readdirSync(sysPath).filter(function (file) {
            let isDir = false;
            try {
                isDir = fs.statSync(path.join(sysPath, file)).isDirectory();
            } catch (e) {
                //Errors omitted like EPERM, EBUSY, etc.
            }

            return isDir;
        });
    },

    /**
     * Function that returns array of files in the specified directory
     *
     * @param dir
     * @returns {string[]}
     */
    readDir: function (dir) {
        let dirContent = [];

        try {
            dirContent = fs.readdirSync(dir)
        } catch (e) {
            //Errors omitted like EPERM, EBUSY, etc.
        }

        return dirContent;
    },

    /**
     * Function that converts date to string
     *
     * @param date
     * @returns {string}
     */
    dateToStr(date) {
        return moment(date).format('lll');
    },

    /**
     * Resets UI to default status
     */
    resetStatus() {
        const statusElem = document.getElementById('status');
        const processVideosBtn = document.getElementById('processVideos');
        const selectFileBtn = document.getElementById('selectFiles');

        processVideosBtn.setAttribute('disabled', 'disabled');
        statusElem.innerText = 'Waiting files';
        statusElem.classList.add('loading');
        selectFileBtn.removeAttribute('disabled');
    },

    /**
     * Function that removes a file if exists
     * @param path
     */
    unlinkIfExists(path) {
        let exists = fs.existsSync(path);
        if (exists) fs.unlinkSync(path);

        return exists;
    }
}
