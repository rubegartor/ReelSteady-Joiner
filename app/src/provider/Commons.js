const version = '1.2.0';
const {app} = require('electron').remote;
const rp = require('request-promise');
const path = require('path');
const fs = require('fs');

const remotePackageJsonUrl = 'https://raw.githubusercontent.com/rubegartor/ReelSteady-Joiner/master/package.json';

module.exports = {
    documentsPath: path.join(app.getPath('documents'), 'ReelSteady Joiner'), //Document path for save processed videos

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

        for (let dir of this.getDirectories(this.documentsPath)) {
            allProjects.push({'dir': dir, 'date': this.strToDate(dir)});
        }

        allProjects.sort(function (a, b) {
            return a.date - b.date;
        });

        for (let project of allProjects.reverse().slice(0, 4)) {
            let files = this.readDir(path.join(this.documentsPath, project.dir));
            console.log(files);
            let row = document.createElement('div');
            let dtFmt = this.dateToStr(this.strToDate(project.dir), '-', ':');
            let innerText = files.length > 0 ? files[0] + ' - (' + dtFmt + ')' : '(Empty) - ' + dtFmt;

            row.classList.add('item');
            row.classList.add('openPath');
            row.dataset.path = project.dir;
            row.innerText = innerText;
            lastProjectContainer.append(row);
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
     * Function that converts string to date
     *
     * @param dateString
     * @returns {Date}
     */
    strToDate(dateString) {
        let arrDt = dateString.match(/(\d{2})-(\d{2})-(\d{4}) (\d{2})_(\d{2})_(\d{2})/);
        return new Date(arrDt[3], arrDt[2] - 1, arrDt[1], arrDt[4], arrDt[5], arrDt[6]);
    },

    /**
     * Function that converts date to string with selected separators
     *
     * @param date
     * @param dateSeparator
     * @param timeSeparator
     * @returns {string}
     */
    dateToStr(date, dateSeparator, timeSeparator) {
        return [('0' + date.getDate()).slice(-2), ('0' + (date.getMonth() + 1)).slice(-2), date.getFullYear()].join(dateSeparator)
            + ' ' +
            [('0' + date.getHours()).slice(-2), ('0' + date.getMinutes()).slice(-2), ('0' + date.getSeconds()).slice(-2)].join(timeSeparator)
    }
}
