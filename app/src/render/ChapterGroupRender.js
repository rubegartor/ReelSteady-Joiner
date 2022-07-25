const fs = require('fs');
const path = require('path');
const ui = require('../commons/ui');
const Commons = require('../provider/Commons');
const svg = require('../commons/svg');

class ChapterGroupRender {
    constructor(files, dirPath) {
        this._files = files;
        this._dirPath = dirPath;
    }

    /**
     * Function that generates chapter group HTML
     *
     * @returns {HTMLDivElement}
     */
    toHTML() {
        const sortedFiles = this._files.sort();
        const fileStat = fs.statSync(path.join(this._dirPath, sortedFiles[0]));
        const fileMTime = Commons.dateToStr(fileStat.mtime);

        const group = ui.createElem('div');
        group.className = 'group';
        const checkDiv = ui.createElem('div');
        checkDiv.className = 'checkContainer';
        const check = ui.createElem('input');
        check.type = 'checkbox';
        check.id = this._files[0];
        check.dataset.type = 'chapterGroup';
        check.name = 'chapterGroup';
        check.dataset.dirPath = this._dirPath;
        check.dataset.files = this._files.join(',');
        checkDiv.appendChild(check);
        const checkLabel = ui.createElem('label');
        checkLabel.style.setProperty('margin-top', '-1px');
        checkLabel.innerText = this._files[0] + ' (' + this._files.length + ' files) ' + '(' + fileMTime + ')';
        checkLabel.htmlFor = this._files[0];

        group.appendChild(checkDiv);
        group.appendChild(checkLabel);

        return group;
    }

    /**
     * Function to show empty message when chapters count is 0
     *
     * @returns {HTMLDivElement}
     */
    static toHTMLEmpty() {
        const emptyGroup = ui.createElem('div');
        emptyGroup.className = 'group empty';
        emptyGroup.innerHTML = `${svg.getExclamation()} No chapters found`;

        return emptyGroup;
    }
}

module.exports = ChapterGroupRender;
