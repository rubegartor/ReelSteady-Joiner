class ProjectGroup {

    constructor(dirPath, file) {
        this._dirPath = dirPath;
        this._file = file;
    }

    toHTML() {
        let projectGroup = document.createElement('div');
        let innerText = this._file + ' - ' + this._dirPath.replaceAll('-', ':');
        projectGroup.classList.add('item');
        projectGroup.classList.add('openPath');
        projectGroup.dataset.path = this._dirPath;
        projectGroup.innerText = innerText;

        return projectGroup;
    }

    static toEmptyHTML() {
        let projectGroup = document.createElement('div');
        projectGroup.classList.add('empty-item');
        projectGroup.innerHTML = '🔎 No projects found, start a new one now!';

        return projectGroup;
    }
}

module.exports = ProjectGroup;
