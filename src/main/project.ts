import path from 'node:path';

import { CONFIG, LOG, PROJECTS } from '@main/app';
import { ProcessingTypeEnum } from '@main/config';
import { LogTypeEnum } from '@main/logging';
import { mainWindow } from '@main/main';
import { convertTimemarkToSeconds, uuidv4 } from '@main/util';
import {
  generateOutputName,
  generateProjectDir,
  getModifiedDate,
  getThumbnail,
  getTotalVidDuration,
  mergeFilesWithFFmpeg,
  mergeFilesWithMp4Merge
} from '@main/videoProvider';

import { AppChannel } from '@src/AppChannel';
import { UnexpededCloseSpawn } from '@main/error/UnexpededCloseSpawn';

export enum ProjectType {
  PROJECT_MP4 = 'mp4',
  PROJECT_360 = '360'
}

class Project {
  public readonly id: string = uuidv4();
  public files: string[] = [];
  public absolutePath: string = '';
  public savePath: string = '';
  public name: string = '';
  public outputName: string = '';
  public type: string = '';
  public duration: number = 0;
  public modifiedDate: Date = new Date();
  public thumbnail: string = '';
  public failed: boolean = false;
  public progress: number = 0;
  public available: boolean = false;
  public completed: boolean = false;

  constructor(properties: Partial<Project>) {
    Object.assign(this, properties);

    this.init();
  }

  get filePaths(): string[] {
    return this.files.map((file: string): string => path.join(this.absolutePath, file));
  }

  public toJSON(): Record<string, unknown> {
    const validTypes: string[] = ['string', 'number', 'boolean'];
    const obj: Record<string, unknown> = {};

    Object.entries(this).forEach(([key, value]): void => {
      if (validTypes.includes(typeof value) || Array.isArray(value) || value instanceof Date) {
        if (value instanceof Date) value = this.modifiedDate.getTime();

        obj[key] = value;
      }
    });

    return obj;
  }

  public merge(): Promise<void> {
    return new Promise((resolve): void => {
      LOG.info(`Merging project: ${this.name}`, LogTypeEnum.PROJECT, this.name);
      LOG.info(JSON.stringify(CONFIG), LogTypeEnum.PROJECT, this.name);

      generateProjectDir(this);
      generateOutputName(this).then((): void => {
        if (CONFIG.processingType === ProcessingTypeEnum.MP4MERGE) {
          this.mergeMP4Merge().then(resolve);
        } else {
          this.mergeFFMPEG().then(resolve);
        }
      });
    });
  }

  /**
   * This method change the project status to available when all required info is fetched
   */
  private init(): void {
    this.name = path.parse(this.files[0]).name;

    switch (path.extname(this.files[0]).toLowerCase().split('.').pop()) {
      case ProjectType.PROJECT_MP4:
        this.type = ProjectType.PROJECT_MP4;
        break;
      case ProjectType.PROJECT_360:
        this.type = ProjectType.PROJECT_360;
        break;
    }

    const getThumbnailPromise: Promise<void> = getThumbnail(this).then((thumbnail: string): void => {
      this.thumbnail = thumbnail;
    });

    const totalVidDurationPromise: Promise<void> = getTotalVidDuration(this).then((duration: number): void => {
      this.duration = duration;
    });

    const vidModifiedDatePromise: Promise<void> = getModifiedDate(this).then((modifiedDate: Date): void => {
      this.modifiedDate = modifiedDate;
    });

    Promise.all([getThumbnailPromise, totalVidDurationPromise, vidModifiedDatePromise])
      .then((): void => {
        this.available = true;
      })
      .catch((): void => {
        this.available = true;
        this.failed = true;
      })
      .finally((): void => {
        this.update();

        if (PROJECTS.every((project: Project): boolean => project.available)) {
          mainWindow?.webContents.send(AppChannel.AllProjectsAvailable);
        }
      });
  }

  private update(): void {
    if (!mainWindow?.isDestroyed()) {
      mainWindow?.webContents.send(AppChannel.ProjectChanged.replace('{id}', this.id), this.toJSON());
    }
  }

  private mergeMP4Merge(): Promise<void> {
    return new Promise((resolve): void => {
      mergeFilesWithMp4Merge(this, (progress: string): void => {
        this.progress = parseInt(progress);
        this.update();
      }).then((): void => {
        this.completed = true;
        this.progress = 100;

        this.update();
        resolve();
      }).catch((error): void => {
        if (error instanceof UnexpededCloseSpawn) {
          LOG.error(error.toString(), LogTypeEnum.ERROR);

          this.failed = true;
          this.update();

          resolve();
        } else {
          throw error;
        }
      });
    });
  }

  private mergeFFMPEG(): Promise<void> {
    return new Promise((resolve): void => {
      mergeFilesWithFFmpeg(this, (progress: { timemark: string }): void => {
        this.progress = Math.floor((convertTimemarkToSeconds(progress.timemark) / this.duration) * 100);
        this.update();
      }).then((): void => {
        this.completed = true;
        this.progress = 100;

        this.update();
        resolve();
      }).catch((error): void => {
        if (error instanceof UnexpededCloseSpawn) {
          LOG.error(error.toString(), LogTypeEnum.ERROR);

          this.failed = true;
          this.update();

          resolve();
        } else {
          throw error;
        }
      });
    });
  }
}

export default Project;
