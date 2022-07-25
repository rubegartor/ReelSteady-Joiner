const path = require('path');
const log = require('electron-log');
const unhandled = require('electron-unhandled');
const {openNewGitHubIssue, debugInfo} = require('electron-util');

module.exports = function (logPathBase) {
    const logPath = path.join(logPathBase, 'error.log');

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
}
