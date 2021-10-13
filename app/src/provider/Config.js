const os = require('os');
const path = require('path');
const fs = require('fs');

const ConfigSaveError = require(path.join(__dirname, '../exceptions/ConfigSaveError'));

const CONFIG_FILE = 'config.json';
const CONFIG_DIR_WIN = path.join(os.homedir(), 'AppData', 'Local', 'ReelSteady Joiner');
const CONFIG_DIR_MAC = path.join(os.homedir(), '.reelsteady-joiner');

const CONFIG_DIR = os.platform() === 'darwin' ? CONFIG_DIR_MAC : CONFIG_DIR_WIN;

class Config {
    constructor() {
        // noinspection JSUnusedGlobalSymbols
        this.autoScan = false;
        this.savePath = '';
        this.groupProjects = false;
    }

    loadConfig() {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, {recursive: true});
        }

        if (!fs.existsSync(path.join(CONFIG_DIR, CONFIG_FILE))) {
            this.saveConfig();
        }

        fs.readFile(path.join(CONFIG_DIR, CONFIG_FILE), 'utf8', (err, data) => {
            let jsonData = JSON.parse(data);

            for (let key in jsonData) {
                if (jsonData.hasOwnProperty(key) && typeof this[key] !== 'undefined') {
                    this[key] = jsonData[key];
                }
            }
        });
    }

    saveConfig() {
        fs.writeFile(path.join(CONFIG_DIR, CONFIG_FILE), JSON.stringify(this), (err) => {
            if (err) {
                throw new ConfigSaveError('Unable to save settings');
            }
        });
    }
}

module.exports = Config;
