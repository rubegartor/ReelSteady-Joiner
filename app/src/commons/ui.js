module.exports = {
    get(id) {
        return document.getElementById(id);
    },

    getWithClass(cls) {
        return document.getElementsByClassName(cls);
    },

    getWithSelector(selector, context = undefined) {
        return context !== undefined ? context.querySelectorAll(selector) : document.querySelectorAll(selector);
    },

    createElem(tag) {
        return document.createElement(tag);
    },

    onClick(elem, listener) {
        if (elem instanceof HTMLCollection) {
            Array.from(elem).forEach(function(elem) {
                elem.addEventListener('click', listener);
            });
        } else {
            elem.addEventListener('click', listener);
        }
    },

    onChange(elem, listener) {
        elem.addEventListener('change', listener);
    },

    disableDrop(cb) {
        document.addEventListener('dragenter', (e) => {
            e.preventDefault();
        });

        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        document.addEventListener('drop', (e) => {
            cb();
            e.preventDefault();
        });
    },

    hide(elems) {
        if (!Array.isArray(elems)) {
            elems = [elems];
        }

        for (const elem of elems) {
            elem.style.setProperty('display', 'none');
        }
    },

    show(elems) {
        if (!Array.isArray(elems)) {
            elems = [elems];
        }

        for (const elem of elems) {
            elem.style.removeProperty('display');
        }
    },

    enable(elems) {
        if (!Array.isArray(elems)) {
            elems = [elems];
        }

        for (const elem of elems) {
            elem.removeAttribute('disabled');
        }
    },

    disable(elems) {
        if (!Array.isArray(elems)) {
            elems = [elems];
        }

        for (const elem of elems) {
            elem.setAttribute('disabled', 'disabled');
        }
    }
}
