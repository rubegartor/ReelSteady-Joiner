import { IpcMainEvent, IpcMainInvokeEvent, OpenDialogReturnValue, app, dialog, ipcMain, shell } from 'electron';
import https from 'node:https';
import pLimit from 'p-limit';

import Config from '@main/config';
import { FileGroups, loadFiles } from '@main/fileSystem';
import Logging, { LOG_DIR, LogTypeEnum } from '@main/logging';
import { mainWindow } from '@main/main';
import Project from '@main/project';
import { updateUrl, uuidv4, version } from '@main/util';

import { AppChannel } from '@src/AppChannel';

export const LOG: Logging = new Logging();

LOG.initUnhandled();

export const CONFIG: Config = new Config();

CONFIG.init();

export const PROJECTS: Project[] = [];

const loadProjects = async (path: string): Promise<void> => {
  try {
    const fileGroups: FileGroups = await loadFiles(path);
    for (const dRead of Object.entries(fileGroups)) {
      const [key, data] = dRead;
      const project: Project = new Project({
        files: data.files,
        absolutePath: data.absolutePath,
        name: key
      });

      // Remove completed projects
      PROJECTS.filter((p: Project): boolean => p.completed).forEach((p: Project): void => {
        PROJECTS.splice(PROJECTS.indexOf(p), 1);
      });

      const exists: boolean = PROJECTS.some(
        (p: Project): boolean => p.absolutePath === project.absolutePath && p.files[0] === project.files[0]
      );

      if (!exists) {
        PROJECTS.push(project);
      }
    }

    return;
  } catch (error) {
    ipcMain.emit(AppChannel.UnhandledException, error);
  }
};

ipcMain.on(AppChannel.UnhandledException, (_, data): void => {
  throw data;
});

ipcMain.on(AppChannel.GetPlatform, (event: IpcMainEvent): void => {
  event.returnValue = process.platform;
});

ipcMain.on(AppChannel.GetUUIDV4, (event: IpcMainEvent): void => {
  event.returnValue = uuidv4();
});

ipcMain.on(AppChannel.CloseApp, (): void => {
  app.quit();
});

ipcMain.on(AppChannel.MinimizeApp, (): void => {
  mainWindow?.minimize();
});

ipcMain.handle(AppChannel.OpenDialog, async (event: IpcMainInvokeEvent, path?: string): Promise<undefined | string> => {
  if (process.env.NODE_ENV === 'test' && path !== undefined) {
    event.sender.send(AppChannel.OpenDialogReturn, path);
    return path;
  } else {
    let returnValue: string | undefined = undefined;

    const result: OpenDialogReturnValue = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });

    if (!result.canceled && result.filePaths.length !== 0) {
      returnValue = result.filePaths[0];
    }

    return returnValue;
  }
});

ipcMain.on(AppChannel.OpenLog, (): void => {
  shell.openPath(LOG_DIR).then();
});

ipcMain.on(AppChannel.GetConfig, (event: IpcMainEvent): void => {
  event.returnValue = CONFIG;
});

ipcMain.on(AppChannel.UpdateConfig, (_: IpcMainEvent, args: { key: string; value: never }): void => {
  CONFIG[args.key as keyof Config] = args.value;
  CONFIG.saveConfig();
});

ipcMain.on(AppChannel.OpenPath, (_: IpcMainEvent, args: { path: string }): void => {
  shell.openPath(args.path).then();
});

ipcMain.on(AppChannel.RemoveProject, (_: IpcMainEvent, args: { projectId: string }): void => {
  const projectIndex: number = PROJECTS.findIndex((project: Project): boolean => project.id === args.projectId);

  if (projectIndex === -1) return;

  PROJECTS.splice(projectIndex, 1);
});

ipcMain.handle(AppChannel.CheckUpdate, async (): Promise<boolean> => {
  const fetchRemoteVersion = async (url: string): Promise<string | null> => {
    return new Promise((resolve, reject): void => {
      https
        .get(url, (res): void => {
          let data: string = '';

          res.on('data', (chunk): void => {
            data += chunk;
          });

          res.on('end', (): void => {
            try {
              const response: { version: string } = JSON.parse(data);
              resolve(response.version);
            } catch (error) {
              reject(error);
            }
          });
        })
        .on('error', (err): void => {
          reject(err);
        });
    });
  };

  try {
    const repoVersion: string | null = await fetchRemoteVersion(updateUrl);

    return !!(repoVersion && repoVersion !== version);
  } catch (error) {
    LOG.error(error as string, LogTypeEnum.ERROR);
    return false;
  }
});

ipcMain.handle(
  AppChannel.GetProjects,
  async (
    _: IpcMainInvokeEvent,
    args: {
      path?: string;
    }
  ): Promise<Record<string, unknown>[]> => {
    try {
      if (args.path) {
        return loadProjects(args.path).then((): Record<string, unknown>[] => {
          return PROJECTS.map((project: Project): Record<string, unknown> => project.toJSON());
        });
      }

      return PROJECTS.map((project: Project): Record<string, unknown> => project.toJSON());
    } catch (error) {
      ipcMain.emit(AppChannel.UnhandledException, error);
      return [];
    }
  }
);

ipcMain.handle(
  AppChannel.GetProject,
  async (
    _: IpcMainInvokeEvent,
    args: {
      projectId: string;
    }
  ): Promise<object> => {
    try {
      const project: Project | undefined = PROJECTS.find((p: Project): boolean => p.id === args.projectId);

      if (project) {
        return project.toJSON();
      }

      return {};
    } catch (error) {
      ipcMain.emit(AppChannel.UnhandledException, error);
      return {};
    }
  }
);

ipcMain.on(AppChannel.GetLogDir, (event: IpcMainEvent): void => {
  event.returnValue = LOG_DIR;
});

ipcMain.on(AppChannel.MergeProjects, (): void => {
  const limit: pLimit.Limit = pLimit(CONFIG.concurrentProjects);

  const input: Promise<void>[] = PROJECTS.filter((p: Project): boolean => !p.failed && !p.completed).map((p: Project): Promise<void> => {
    return limit((): Promise<void> => p.merge());
  });

  Promise.allSettled(input).then((): void => {
    mainWindow?.webContents.send(AppChannel.AllProjectsCompleted);
  });
});
