class ProgressBar {
    static COLOR_ORANGE = 'progress-orange';
    static COLOR_GREEN = 'progress-green';
    static COLOR_RED = 'progress-red';

    constructor(elem) {
        this._elem = elem;
        this._value = elem.value;
        this._maximum = elem.max;

        for (let clss of this._elem.classList) {
            if (clss.includes('progress-')) {
                this._color = clss;
                break;
            }
        }
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
