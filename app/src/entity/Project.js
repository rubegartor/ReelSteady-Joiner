const path = require('path');
const {v4: uuidv4} = require('uuid');
const VideoProcessor = require('../provider/VideoProcessor');
const ProjectType = require('../entity/ProjectType');

class Project {
    constructor(dirPath, files) {
        this._id = uuidv4();
        this._type = undefined;
        this._projectPath = undefined;
        this._dirPath = dirPath;
        this._files = files.sort();
        this._name = path.parse(this._files[0]).name;
        this._duration = 0; //Time in seconds
        this._modifiedDate = '';
        this._failed = false;
        this._available = false;
        this._completed = false;
        this._elem = undefined;

        this.init();
    }

    get id() {
        return this._id;
    }

    get type() {
        return this._type;
    }

    get files() {
        return this._files;
    }

    get filePaths() {
        return this._files.map((f) => { return path.join(this._dirPath, f) });
    }

    get projectPath() {
        return this._projectPath;
    }

    set projectPath(value) {
        this._projectPath = value;
    }

    get dirPath()  {
        return this._dirPath;
    }

    get available() {
        return this._available;
    }

    get failed() {
        return this._failed;
    }

    get completed() {
        return this._completed;
    }

    set completed(value) {
        this._completed = value;
    }

    get name() {
        return this._name;
    }

    set name(value) {
        this._name = value;
    }

    get duration() {
        return this._duration;
    }

    //Format:
    get modifiedDate() {
        return this._modifiedDate;
    }

    /**
     * Function that deletes the project
     */
    remove() {
        const index = projects.findIndex(o => {
            return o.id === this._id;
        });

        if (index > -1) {
            projects.splice(index, 1);
        }
    }

    /**
     * This method change the project status to available when all required info is fetched
     */
    init() {
        switch (path.extname(this.files[0]).toLowerCase().split('.').pop()) {
            case ProjectType.PROJECT_MP4:
                this._type = ProjectType.PROJECT_MP4;
                break;
            case ProjectType.PROJECT_360:
                this._type = ProjectType.PROJECT_360;
                break;
        }

        const vidDurationProm = VideoProcessor.getTotalVidDuration(this).then(duration => {
            this._duration = duration;
        });

        const vidModifiedDateProm = VideoProcessor.getModifiedDate(this.filePaths[0]).then(modifiedDate => {
            this._modifiedDate = modifiedDate;
        });

        Promise.all([vidDurationProm, vidModifiedDateProm]).then(() => {
            this._available = true;
        }).catch((e) => {
            this._available = true
            this._failed = true;

            throw e;
        });
    }
}

module.exports = Project;
