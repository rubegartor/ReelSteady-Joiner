import { app } from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export enum ProcessingTypeEnum {
  MP4MERGE = 'mp4merge',
  FFMPEG = 'ffmpeg'
}

export enum SavePathEnum {
  PROJECT_PATH = 'project_path',
  SOURCE_PATH = 'source_path'
}

const CONFIG_FILE: string = 'config.json';
export let CONFIG_DIR: string;

if (os.platform() === 'darwin') {
  CONFIG_DIR = path.join(os.homedir(), app.getName());
} else {
  CONFIG_DIR = path.join(process.env.APPDATA || (process.env.HOME as string), app.getName());
}

class Config {
  public preservePCMAudio: boolean = false;
  public savePath: string = '';
  public exportOption: string = SavePathEnum.PROJECT_PATH;
  public concurrentProjects: number = 1;
  public processingType: ProcessingTypeEnum = ProcessingTypeEnum.MP4MERGE;
  public pathDepth: number = 0;

  public SavePathEnum: typeof SavePathEnum = SavePathEnum;
  public ProcessingTypeEnum: typeof ProcessingTypeEnum = ProcessingTypeEnum;

  constructor() {
    this.setDefaultValues();
  }

  public init(): void {
    this.loadConfig();
  }

  public saveConfig(): void {
    const excludeProps: string[] = ['SavePathEnum', 'ProcessingTypeEnum'];
    const configToSave: { [p: string]: unknown } = Object.entries(this).reduce(
      (acc, [key, value]): { [p: string]: unknown } => {
        if (!excludeProps.includes(key)) {
          acc[key] = value;
        }
        return acc;
      },
      {} as { [key: string]: unknown }
    );

    // PCM Audio is only available for 360 files and FFmpeg processing type
    if (this.processingType === ProcessingTypeEnum.MP4MERGE) {
      this.preservePCMAudio = false;
    }

    fs.writeFileSync(path.join(CONFIG_DIR, CONFIG_FILE), JSON.stringify(configToSave));
  }

  private isValidConfig(): boolean {
    if (!fs.existsSync(this.savePath)) return false;
    if (this.concurrentProjects < 1 || this.concurrentProjects > 5) return false;
    if (this.pathDepth < 0 || this.pathDepth > 100) return false;
    if (this.processingType !== ProcessingTypeEnum.MP4MERGE && this.processingType !== ProcessingTypeEnum.FFMPEG) return false;
    return !(this.exportOption !== SavePathEnum.PROJECT_PATH && this.exportOption !== SavePathEnum.SOURCE_PATH);
  }

  private setDefaultValues(): void {
    this.savePath = '';
    this.exportOption = SavePathEnum.PROJECT_PATH;
    this.concurrentProjects = 1;
    this.preservePCMAudio = false;
    this.processingType = ProcessingTypeEnum.MP4MERGE;
    this.pathDepth = 0;
  }

  private loadConfig(): void {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    if (!fs.existsSync(path.join(CONFIG_DIR, CONFIG_FILE))) {
      this.saveConfig();
    }

    const configPath: string = path.join(CONFIG_DIR, CONFIG_FILE);
    const jsonData: { [key: string]: never } = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    for (const key in jsonData) {
      this[key as keyof Config] = jsonData[key];
    }

    if (!this.isValidConfig()) {
      this.setDefaultValues();
      this.saveConfig();
    }

    if (!fs.existsSync(this.savePath)) {
      this.savePath = path.join(app.getPath('documents'), app.getName());

      this.saveConfig();
    }
  }
}

export default Config;
