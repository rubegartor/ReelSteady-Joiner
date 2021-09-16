const version = '1.2.0-beta';
const {remote} = require('electron');
const {app} = require('electron').remote;
const rp = require('request-promise');
const path = require('path');
const fs = require('fs');

const ProjectGroup = require(path.join(__dirname, '../components/ProjectGroup'));

const remotePackageJsonUrl = 'https://raw.githubusercontent.com/rubegartor/ReelSteady-Joiner/master/package.json';
const config = remote.getGlobal('globalConfig');
const moment = remote.getGlobal('globalMoment');

module.exports = {
    /**
     * Function that checks if ReelSteady Joiner has new updates
     */
    checkForUpdates: function () {
        let updateAvailableLink = document.getElementById('updateAvailable');

        rp(remotePackageJsonUrl)
            .then(function (data) {
                let packageJson = JSON.parse(data.toString());
                let repoVersion = packageJson.version;

                if (repoVersion !== version) {
                    updateAvailableLink.style.removeProperty('display');
                } else {
                    updateAvailableLink.style.setProperty('display', 'none');
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
                } catch (e) {}
            }
        }

        allProjects.sort(function (a, b) {
            return a.date - b.date;
        });

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
            return fs.statSync(path.join(sysPath, file)).isDirectory();
        });
    },

    /**
     * Function that returns array of files in the specified directory
     *
     * @param dir
     * @returns {string[]}
     */
    readDir: function (dir) {
        return fs.readdirSync(dir);
    },

    /**
     * Function that converts date to string with selected separators
     *
     * @param date
     * @returns {string}
     */
    dateToStr(date) {
        return moment(date).format('lll').replace(':', '-');
    }
}
