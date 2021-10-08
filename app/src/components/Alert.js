class Alert {
    static ALERT_SUCCESS = 'alert-success';
    static ALERT_DANGER = 'alert-danger';
    static ALERT_INFO = 'alert-info';

    constructor(body, type, timeout = 5000) {
        this._body = body;
        this._type = type;
        this._timeout = timeout;
        this._width = 0;
        this._elem = undefined;
        this._onRemove = undefined;
    }

    set width(value) {
        this._width = value;
    }

    set onRemove(callback) {
        this._onRemove = callback;
    }

    /**
     * Function that generates HTML alert element
     *
     * @returns {HTMLDivElement}
     */
    toHTML() {
        let alert = document.createElement('div')
        alert.innerHTML = this._body;
        if (this._width !== 0) alert.style.setProperty('width', this._width);
        alert.classList.add('alert', this._type);

        let that = this;
        if (this._timeout !== 0) {
            setTimeout(() => {
                that._elem.classList.add('alert-hide');
                this._removeAlert(that);
            }, this._timeout);
        } else {
            let alertClose = document.createElement('div');
            alertClose.innerHTML = '&times;';
            alertClose.classList.add('alert-close');

            alertClose.addEventListener('click', () => {
                this._removeAlert(that);
            });

            alert.appendChild(alertClose);
        }

        this._elem = alert;

        return alert;
    }

    /**
     * Remove the alert
     *
     * @param alert
     * @private
     */
    _removeAlert(alert) {
        alert._elem.classList.add('alert-hide');
        setTimeout(() => {
            alert._elem.remove();

            if (alert._onRemove !== undefined && typeof alert._onRemove === 'function') {
                alert._onRemove();
            }
        }, 500);
    }

    /**
     * Function that adds an alert to the alert container
     *
     * @param alert
     */
    static appendToContainer(alert) {
        document.getElementById('alertContainer').appendChild(alert);
    }
}

module.exports = Alert;
