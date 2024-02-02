const {ipcRenderer} = require('electron');
const isValidFilename = require('valid-filename');
const ui = require('../commons/ui');
const svg = require('../commons/svg');
const Commons = require('../provider/Commons');

const AlertRender = require('../render/AlertRender');

class ProjectRender {
    constructor(json) {
        Object.assign(this, json);
        this._elem = undefined;

        const waitFor = (cd, cb) => { cd() ? cb() : window.setTimeout(waitFor.bind(null, cd, cb), 250) };
        waitFor(() => {
            this.updateProject();
            return this.get('_available') && this._elem;
        }, () => {
            if (!this.get('_failed')) {
                const dateParts = this.get('_modifiedDate').split(' ');
                const dt = new Date(dateParts[0].replace(/:/g, '/') + ' ' + dateParts[1]);
                ui.getWithSelector('[data-actionInfoTooltipText-id="' + this.get('_id') + '"]', this._elem)[0].innerText = Commons.dateToStr(dt);
            } else {
                ui.getWithSelector('.actions-container', this._elem)[0].classList.add('failed');
                ui.getWithSelector('.progress-container', this._elem)[0].classList.add('failed');
                this.toFailedHTML();
            }
        });
    }

    get(property) {
        return this[property];
    }

    updateProject() {
        const project = ipcRenderer.sendSync('getProject', {'id': this.get('_id')});
        let preElem = this._elem;
        Object.assign(this, project);
        if (preElem !== undefined) { // Skip property override
            this._elem = preElem;
        }
    }

    /**
     * Function that generates project HTML
     *
     * @returns {Electron.WebviewTag}
     */
    toHTML() {
        const project = ui.createElem('div');
        project.setAttribute('data-id', this.get('_id'));
        project.classList.add('item');

        const title = ui.createElem('div');
        title.classList.add('title');
        title.innerText = this.get('_name');
        title.setAttribute('title', this.get('_name'));
        project.appendChild(title);

        const loading = ui.createElem('div');
        loading.classList.add('ring');
        loading.innerHTML = '<div></div><div></div><div></div><div></div>';
        project.appendChild(loading);

        const image = ui.createElem('img');
        image.setAttribute('id', this.get('_id'));
        ui.hide(image);
        image.classList.add('thumbnail');
        project.appendChild(image);

        ipcRenderer.send('getThumbnail', {'id': this.get('_id')});
        ipcRenderer.on('getThumbnailReturn', (event, args) => {
            if (this.get('_id') === args.id) {
                loading.remove();
                image.setAttribute('src', args.path);
                ui.show(image);
            }
        })

        const progressContainer = ui.createElem('div');
        progressContainer.classList.add('progress-container');
        const progressBar = ui.createElem('progress');
        progressBar.classList.add('progress-orange');
        progressBar.value = 0;
        progressBar.setAttribute('data-progress-' + this.get('_id'), true);
        progressContainer.appendChild(progressBar);
        ui.hide(progressContainer);
        project.appendChild(progressContainer);

        const actionsContainer = ui.createElem('div');
        actionsContainer.classList.add('actions-container');

        const actionEdit = ui.createElem('span');
        actionEdit.classList.add('action');
        actionEdit.onclick = () => { this.showEditModal() };
        actionEdit.innerHTML = svg.getPencil();
        actionsContainer.appendChild(actionEdit);

        const actionInfo = ui.createElem('span');
        actionInfo.classList.add('action');
        actionInfo.classList.add('right');
        actionInfo.innerHTML = svg.getInfo();

        const actionInfoTooltip = ui.createElem('div');
        actionInfoTooltip.classList.add('tooltip');

        const actionInfoTooltipText = ui.createElem('div');
        actionInfoTooltipText.setAttribute('data-actionInfoTooltipText-id', this.get('_id'));
        actionInfoTooltipText.classList.add('tooltiptext');
        actionInfoTooltipText.innerText = this.get('_duration') !== 0 ? this.get('_duration') : 'Loading...';
        actionInfoTooltip.appendChild(actionInfo);
        actionInfoTooltip.appendChild(actionInfoTooltipText);
        actionsContainer.appendChild(actionInfoTooltip);

        const actionRemove = ui.createElem('span');
        actionRemove.classList.add('action');
        actionRemove.onclick = () => { this.remove() };
        actionRemove.innerHTML = svg.getTrash();
        actionsContainer.appendChild(actionRemove);

        project.appendChild(actionsContainer);

        this._elem = project;

        return project;
    }

    /**
     * Function to show empty message when project count is 0
     *
     * @returns {Electron.WebviewTag}
     */
    toEmptyHTML() {
        const emptyProject = ui.createElem('div');
        emptyProject.classList.add('empty-item');
        emptyProject.innerHTML = '🔎 Add files to start merging!';

        return emptyProject;
    }

    toFailedHTML() {
        const actionInfo = ui.createElem('span');
        actionInfo.classList.add('action');
        actionInfo.classList.add('right');
        actionInfo.innerHTML = svg.getError();

        const actionFailed = ui.createElem('div');
        actionFailed.classList.add('tooltip');

        const actionFailedText = ui.createElem('div');
        actionFailedText.classList.add('tooltiptext');
        actionFailedText.innerText = 'Project failed to initialize';
        actionFailed.appendChild(actionInfo);
        actionFailed.appendChild(actionFailedText);

        const actionsContainer = ui.getWithSelector('.actions-container', this._elem)[0];
        actionsContainer.innerHTML = '';

        actionsContainer.appendChild(actionFailed);
    }

    remove() {
        ipcRenderer.send('removeProject', {'id': this.get('_id')});

        this._elem.classList.add('projectHide');
        setTimeout(() => {
            this._elem.remove();

            if (ui.get('projectContainer').childElementCount === 0) {
                ui.disable(ui.get('processVideos'));
                ui.get('projectContainer').appendChild(this.toEmptyHTML());
            }
        }, 350);
    }

    /**
     * Function that shows edit modal
     */
    showEditModal() {
        this.updateProject();

        const editProjectWrapper = ui.get('editProjectWrapper');
        const projectNameInput = ui.get('projectName');

        projectNameInput.value = this.get('_name');

        const saveButton = ui.createElem('button');
        saveButton.setAttribute('type', 'button');
        saveButton.classList.add('button-green');
        saveButton.innerText = 'Save';
        saveButton.onclick = () => {
            const projectNameInput = ui.get('projectName');
            const projectTitleElem = this._elem.getElementsByClassName('title')[0];

            if (!isValidFilename(projectNameInput.value)) {
                const alert = new AlertRender('Invalid project name', AlertRender.ALERT_DANGER, 2500);
                alert.width = '250px';

                AlertRender.appendToContainer(alert.toHTML());
            } else {
                ipcRenderer.send('updateProjectName', {'id': this.get('_id'), 'name': projectNameInput.value});

                projectTitleElem.innerText = projectNameInput.value;
                projectTitleElem.setAttribute('title', projectNameInput.value);

                saveButton.remove();

                ui.hide(ui.get('editProjectWrapper'));
            }
        };

        ui.get('editProjectButtonContainer').appendChild(saveButton);

        ui.show(editProjectWrapper);
    }
}

module.exports = ProjectRender;
