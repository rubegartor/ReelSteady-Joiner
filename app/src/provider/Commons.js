const version = '1.2.0';
const {app} = require('electron').remote;
const rp = require('request-promise');
const path = require('path');

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
    }
}
