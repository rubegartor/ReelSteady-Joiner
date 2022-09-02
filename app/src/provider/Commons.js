const version = '1.3.0';
const fs = require('fs');
const moment = require('moment');
const {ipcRenderer} = require('electron');

module.exports = {
    /**
     * Function that returns if app is packaged or not (Only for main process)
     *
     * @returns {boolean}
     */
    isDev: function () {
        return process.env.APP_DEV ? (process.env.APP_DEV.trim() === "true") : false;
    },

    /**
     * Function that returns array of files in the specified directory (Only for main process)
     *
     * @param dir
     * @returns {string[]}
     */
    readDir: function (dir) {
        let dirContent = [];

        try {
            dirContent = fs.readdirSync(dir);
        } catch (_) {
            //Errors omitted like EPERM, EBUSY, etc.
        }

        return dirContent;
    },

    /**
     * Function that converts date to string (Main and render process)
     *
     * @param date
     * @returns {string}
     */
    dateToStr(date) {
        moment.locale(typeof locale === 'undefined' ? ipcRenderer.sendSync('getLocale') : locale);
        return moment(date).format('lll');
    },

    /**
     * Function that removes a file if exists (Only for main process)
     *
     * @param path
     */
    unlinkIfExists(path) {
        const exists = fs.existsSync(path);
        if (exists) fs.unlinkSync(path);

        return exists;
    },

    /**
     * Function that gets the file size (Only for main process)
     *
     * @param filePath
     */
    getFileSize(filePath) {
        return fs.statSync(filePath).size;
    },

    /**
     * Function that scapes unusual characters in path string (Only for main process)
     * https://www.ffmpeg.org/ffmpeg-utils.html#Quoting-and-escaping
     *
     * @param path
     * @returns string
     */
    scapePath(path) {
        return path.replace(/'/g, "'\\''");
    },

    version
}
