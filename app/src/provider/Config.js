const os = require('os');
const path = require('path');
const fs = require('fs');

const CONFIG_FILE = 'config.json';
const CONFIG_DIR = path.join(os.homedir(), 'AppData', 'Local', 'ReelSteady Joiner');

class Config {
    constructor() {
        // noinspection JSUnusedGlobalSymbols
        this.autoScan = false;
        this.savePath = '';
    }

    loadConfig() {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, {recursive: true});
        }

        if (!fs.existsSync(path.join(CONFIG_DIR, CONFIG_FILE))) {
            fs.writeFile(path.join(CONFIG_DIR, CONFIG_FILE), JSON.stringify(this), () => {});
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
        fs.writeFile(path.join(CONFIG_DIR, CONFIG_FILE), JSON.stringify(this), () => {});
    }
}

module.exports = Config;