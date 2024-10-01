import { ElectronLog, default as log } from 'electron-log';
import unhandled from 'electron-unhandled';
import { debugInfo, openNewGitHubIssue } from 'electron-util';
import path from 'node:path';

import { CONFIG_DIR } from '@main/config';

export const LOG_DIR: string = path.join(CONFIG_DIR, 'logs');

export enum LogTypeEnum {
  PROJECT = 'project',
  ERROR = 'error'
}

class Logging {
  public log: ElectronLog;
  public type: LogTypeEnum;

  constructor() {
    this.log = log;
    this.type = LogTypeEnum.ERROR;
    this.setPath(path.join(LOG_DIR, 'error.log'));

    this.initUnhandled();
  }

  public initUnhandled(): void {
    unhandled({
      logger: (error: Error): void => {
        this.error(`\`\`\`\n${error.stack}\n\`\`\`\n\n---\n\n${debugInfo()}`, LogTypeEnum.ERROR);
      },
      showDialog: true,
      reportButton: (error: Error): void => {
        openNewGitHubIssue({
          user: 'rubegartor',
          repo: 'ReelSteady-Joiner',
          body: `\`\`\`\n${error.stack}\n\`\`\`\n\n---\n\n${debugInfo()}`
        });
      }
    });
  }

  public info(message: string, type: LogTypeEnum, name: string): void {
    this.setLogName(type, name);
    this.log.info(message);
  }

  public error(message: string, type: LogTypeEnum): void {
    this.setLogName(type);
    this.log.error(message);
  }

  private setPath(path: string): void {
    this.log.transports.file.resolvePath = (): string => path;
  }

  private setLogName(type: LogTypeEnum, name?: string): void {
    let logName: string = 'error.log';
    if (type === LogTypeEnum.PROJECT) {
      logName = `${name}.log`;
    }

    this.setPath(path.join(LOG_DIR, logName));
  }
}

export default Logging;
