const version = '1.3.1';
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
     * Function that sorts gopro names (Main and render process)
     * Accepts a maximum number of 999 chapters
     *
     * @param arr
     * @returns array
     */
    sortGoProNames(arr) {
        return arr.sort(function (x, y) {
            x = isNaN(x.substring(1, 4)) ? x.substring(2, 4) : x.substring(1, 4);
            y = isNaN(y.substring(1, 4)) ? y.substring(2, 4) : y.substring(1, 4);

            x = parseInt(x);
            y = parseInt(y);

            if (x < y) return -1;
            if (x > y) return 1;

            return 0;
        });
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

    /**
     * Function that badly deep-clone arrays (Main and render process)
     * (This piece of shit doesn't save functions or other special types)
     *
     * @param array
     * @returns array
     */
    deepClone(array) {
        return JSON.parse(JSON.stringify(array))
    },

    version
}
