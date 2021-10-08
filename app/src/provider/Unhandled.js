const path = require('path');
const os = require('os');
const fs = require('fs');
const log = require('electron-log');
const unhandled = require('electron-unhandled');
const {openNewGitHubIssue, debugInfo} = require('electron-util');

let logPathBase = path.join(os.homedir(), 'AppData', 'Local', 'ReelSteady Joiner', 'logs');
let logPath = path.join(logPathBase, 'error.log');

if (!fs.existsSync(logPathBase)) {
    fs.mkdirSync(logPathBase);
}

log.transports.file.resolvePath = () => logPath;

/**
 * All the unhandled exceptions that are produced are caught by this.
 */
unhandled({
    logger: (error) => {
        log.error(`\`\`\`\n${error.stack}\n\`\`\`\n\n---\n\n${debugInfo()}`);
    },
    showDialog: true,
    reportButton: error => {
        openNewGitHubIssue({
            user: 'rubegartor',
            repo: 'ReelSteady-Joiner',
            body: `\`\`\`\n${error.stack}\n\`\`\`\n\n---\n\n${debugInfo()}`
        });
    }
});
