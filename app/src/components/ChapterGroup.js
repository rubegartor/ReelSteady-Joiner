const fs = require('fs');
const path = require('path');

const Commons = require(path.join(__dirname, '../provider/commons'));

class ChapterGroup {

    constructor(files, dirPath) {
        this._files = files
        this._dirPath = dirPath
    }

    toHTML() {
        let sortedFiles = this._files.sort();
        let fileStat = fs.statSync(path.join(this._dirPath, sortedFiles[0]));
        let fileMTime = Commons.dateToStr(fileStat.mtime).replace('-', ':');

        const group = document.createElement('div');
        group.className = 'group';
        const radioDiv = document.createElement('div');
        radioDiv.className = 'radioContainer';
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.dataset.type = 'chapterGroup';
        radio.name = 'chapterGroup';
        radio.dataset.dirPath = this._dirPath;
        radio.dataset.files = this._files.join(',');
        radioDiv.appendChild(radio);
        const textDiv = document.createElement('div');
        textDiv.innerText = this._files[0] + ' (' + this._files.length + ' files) ' + '(' + fileMTime + ')';

        group.appendChild(radioDiv)
        group.appendChild(textDiv);

        return group;
    }

    static toHTMLEmpty() {
        const emptyGroup = document.createElement('div');
        emptyGroup.className = 'group';
        emptyGroup.style.setProperty('text-align', 'center');
        emptyGroup.innerText = 'No chapters found';

        return emptyGroup;
    }
}

module.exports = ChapterGroup;
