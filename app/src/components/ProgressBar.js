const {exec} = require('child_process');
const ffmpegPath = require('ffmpeg-static').replace(
    'app.asar',
    'app.asar.unpacked'
);

class ProgressBar {
    static COLOR_ORANGE = 'progress-orange';
    static COLOR_GREEN = 'progress-green';

    constructor(elem) {
        this._elem = elem;
        this._value = 0;
        this._maximum = 100;
        this._color = ProgressBar.COLOR_ORANGE;
    }

    get value() {
        return this._value;
    }

    set value(value) {
        this._value = value;
        this._elem.setAttribute('value', this._value);
    }

    get maximum() {
        return this._maximum;
    }

    set maximum(value) {
        this._maximum = value;
        this._elem.setAttribute('max', this._maximum);
    }

    get color() {
        return this._color;
    }

    set color(color) {
        for (let clss of this._elem.classList) {
            if (clss.includes('progress-')) {
                this._elem.classList.remove(clss);
            }
        }

        this._color = color;
        this._elem.classList.add(color);
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
            let prom = new Promise(function (resolve) {
                let cmd = '"' + ffmpegPath + '" -i "' + vidFile + '"';
                exec(cmd, function (error, stdout, stderr) {
                    let output = stderr.substr(stderr.indexOf('Duration:') + 9, stderr.length);
                    resolve(output.substr(0, output.indexOf(',')));
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

            return secs;
        });
    }

    /**
     * Function that returns the actual progress
     * @param data
     * @returns {number}
     */
    getProgress(data) {
        let timeIndex = data.indexOf('time=');
        let time = data.trim().substr(timeIndex + 5, 11);
        let parsedTime = time.split(':');
        let secs = 0;

        secs += parsedTime[0] * 3600;
        secs += parsedTime[1] * 60;
        secs += parseInt(parsedTime[2])

        return secs;
    }
}

module.exports = ProgressBar
