const ui = require('../commons/ui');

class AlertRender {
    static ALERT_SUCCESS = 'alert-success';
    static ALERT_DANGER = 'alert-danger';
    static ALERT_INFO = 'alert-info';
    static ALERT_WARNING = 'alert-warning';

    constructor(body, type, timeout = 5000) {
        this._body = body;
        this._type = type;
        this._timeout = timeout;
        this._width = 0;
        this._elem = undefined;
        this._closeBtn = false;
        this._onRemove = undefined;
    }

    set width(value) {
        this._width = value;
    }

    set onRemove(callback) {
        this._onRemove = callback;
    }

    enableBtn() {
        this._closeBtn = true;
    }

    /**
     * Function that generates HTML alert element
     *
     * @returns {HTMLDivElement}
     */
    toHTML() {
        const alert = ui.createElem('div');
        alert.innerHTML = this._body;
        if (this._width !== 0) alert.style.setProperty('width', this._width);
        alert.classList.add('alert', this._type);

        const that = this;
        if (this._timeout !== 0) {
            setTimeout(() => {
                that._elem.classList.add('alert-hide');
                this._removeAlert(that);
            }, this._timeout);
        }

        if (this._timeout === 0 || this._closeBtn) {
            const alertClose = ui.createElem('div');
            alertClose.innerHTML = '&times;';
            alertClose.classList.add('alert-close');

            ui.onClick(alertClose, () => this._removeAlert(that));
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
        ui.get('alertContainer').appendChild(alert);
    }
}

module.exports = AlertRender;
