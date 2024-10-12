import { spawn } from 'child_process';
import { default as pathToFfmpeg } from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';
import { ChildProcess, exec } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { CONFIG, LOG } from '@main/app';
import { ProcessingTypeEnum, SavePathEnum } from '@main/config';
import { FfmpegNotDefined } from '@main/error/FfmpegNotDefined';
import { UnexpededCloseSpawn } from '@main/error/UnexpededCloseSpawn';
import { UnsupportedArch } from '@main/error/UnsupportedArch';
import { readDirectory } from '@main/fileSystem';
import { LogTypeEnum } from '@main/logging';
import Project, { ProjectType } from '@main/project';
import { convertTimemarkToSeconds, isDev, scapePath } from '@main/util';

const FFMPEG_NOT_DEFINED: string = 'FFmpeg path is undefined';

if (typeof pathToFfmpeg !== 'string') {
  throw new FfmpegNotDefined(FFMPEG_NOT_DEFINED);
}

let ffmpegPath: string = pathToFfmpeg;

if (!isDev) {
  const execName: string = pathToFfmpeg?.substring(pathToFfmpeg?.lastIndexOf('ffmpeg'), pathToFfmpeg?.length);
  ffmpegPath = path.join(pathToFfmpeg?.substring(0, pathToFfmpeg?.indexOf('app.asar')), '../bin', execName);
}

ffmpeg.setFfmpegPath(ffmpegPath);

let mp4MergePath: string;
let gyroProcessPath: string;

const exePath: string = isDev ? path.join(__dirname, '../../resources', 'bin') : path.join(__dirname, '../../../..', 'bin');
const platform: string = os.platform();

if (platform === 'darwin') {
  gyroProcessPath = path.join(exePath, 'udtacopy-mac');
  const mp4MergePathArm64: string = path.join(exePath, 'mp4-merge-mac-arm64');
  const mp4MergePathx64: string = path.join(exePath, 'mp4-merge-mac-x64');

  switch (os.arch()) {
    case 'arm64':
      mp4MergePath = mp4MergePathArm64;
      break;
    case 'x64':
      mp4MergePath = mp4MergePathx64;
      break;
    default:
      throw new UnsupportedArch(os.arch(), 'Unsupported architecture');
  }

  if (isDev) {
    //Give execution permissions to utilities
    fs.chmodSync(gyroProcessPath, 0o755);
    fs.chmodSync(mp4MergePath, 0o755);
  }
} else if (platform === 'win32') {
  gyroProcessPath = path.join(exePath, 'udtacopy-win.exe');
  mp4MergePath = path.join(exePath, 'mp4-merge-win64.exe');
}

const logVideoProviderInfo = (project: Project): void => {
  LOG.info(`FFmpeg path: ${ffmpegPath}`, LogTypeEnum.PROJECT, project.name);
  LOG.info(`Mp4Merge path: ${mp4MergePath}`, LogTypeEnum.PROJECT, project.name);
};

export const getThumbnail = (project: Project): Promise<string> => {
  return new Promise((resolve, reject): void => {
    ffmpeg(path.join(project.absolutePath, project.files[0]))
      .on('end', async (): Promise<void> => {
        const thumbnailPath: string = path.join(os.tmpdir(), `${project.id}.png`);

        const thumbnailData: Buffer = await fs.promises.readFile(thumbnailPath);
        resolve(`data:image/png;base64,${thumbnailData.toString('base64')}`);
      })
      .on('error', function (err: unknown, stdout: unknown, stderr: unknown): void {
        reject({ error: err, stdout: stdout, stderr: stderr });
      })
      .takeScreenshots({
        timemarks: ['00:00:00.000'],
        filename: `${project.id}.png`,
        folder: os.tmpdir(),
        size: '320x240'
      });
  });
};

export const getTotalVidDuration = async (project: Project): Promise<number> => {
  const promises: Promise<string>[] = [];
  for (const vidFile of project.files) {
    const prom: Promise<string> = new Promise(function (resolve: (value: string) => void, reject: (reason?: object) => void): void {
      exec(
        `"${ffmpegPath}" -i "${path.join(project.absolutePath, vidFile)}"`,
        async (error: unknown, stdout: string, stderr: string): Promise<void> => {
          if (stderr.includes('Duration:')) {
            const output: string = stderr.substring(stderr.indexOf('Duration:') + 9, stderr.length);
            const duration: string = output.substring(0, output.indexOf(','));

            resolve(duration);
          } else {
            reject({ error: error, stderr: stderr, stdout: stdout });
          }
        }
      );
    });

    promises.push(prom);
  }

  return Promise.all(promises).then((values: string[]): number => {
    let milliseconds: number = 0;

    for (const time of values) {
      const parsedTime: string = time.trim().replace('\r\n', '');
      milliseconds += convertTimemarkToSeconds(parsedTime);
    }

    return milliseconds;
  });
};

export const getModifiedDate = async (project: Project): Promise<Date> => {
  return new Promise((resolve, reject): void => {
    exec(`"${ffmpegPath}" -i "${path.join(project.absolutePath, project.files[0])}"`, (error, stdout, stderr): void => {
      if (stderr.includes('creation_time')) {
        stderr = stderr.replace(/\s/g, '');

        const creationTime: string = stderr.substring(stderr.indexOf('creation_time:') + 14, stderr.indexOf('firmware:'));

        resolve(new Date(creationTime));
      } else {
        reject({ error: error, stderr: stderr, stdout: stdout });
      }
    });
  });
};

const processGyro = (project: Project): Promise<void> => {
  return new Promise((resolve, reject): void => {
    const args: string[] = [project.filePaths[0], path.join(project.savePath, project.outputName)];
    const proc: ChildProcess = spawn(
      gyroProcessPath,
      args.map((a: string): string => `"${a}"`)
    );

    LOG.info(`procesGryro: ${JSON.stringify(proc)}`, LogTypeEnum.PROJECT, project.name);

    proc.stderr?.on('data', (data): void => {
      proc.kill();
      LOG.info(`Udtacopy stderr data: ${data}`, LogTypeEnum.PROJECT, project.name);
      reject(data);
    });

    proc.stdout?.on('data', (data): void => {
      LOG.info(`Udtacopy stdout data: ${data}`, LogTypeEnum.PROJECT, project.name);
    });

    proc.on('close', (code: number | null): void => {
      if (code === null || code !== 1) reject(new UnexpededCloseSpawn(code, 'Process closed unexpectedly'));
      resolve();
    });
  });
};

export const mergeFilesWithMp4Merge = (project: Project, progressCb: (data: string) => void): Promise<void> => {
  return new Promise((resolve, reject): void => {
    logVideoProviderInfo(project);
    const args: string[] = [...project.filePaths, '--out', path.join(project.savePath, project.outputName)];

    const proc: ChildProcess = spawn(mp4MergePath, args);

    proc.stderr?.on('data', (data): void => {
      proc.kill();
      reject(data);
    });

    proc.stdout?.on('data', (data): void => {
      const strParts: string[] = data.toString().split(' ');
      const percentage: string = strParts[1].substring(0, strParts[1].length - 1);

      if (!isNaN(parseFloat(percentage))) {
        progressCb(percentage);
      }
    });

    proc.on('close', (code: number | null): void => {
      if (code === null || code !== 0) reject(new UnexpededCloseSpawn(code, 'Process closed unexpectedly'));
      resolve();
    });
  });
};

export const mergeFilesWithFFmpeg = (project: Project, progressCb: (progress: { timemark: string }) => void): Promise<void> => {
  return new Promise<void>((resolve, reject): void => {
    (async (): Promise<void> => {
      try {
        logVideoProviderInfo(project);
        const concatFilePath: string = createConcatFile(project);
        const streamMaps: string[] = await getAllStreamMaps(project, concatFilePath);
        const maps: string[] = streamMaps.map((m: string): string => {
          return CONFIG.preservePCMAudio && project.type === ProjectType.PROJECT_360 ? `-map ${m}` : `-map 0:${m}`;
        });

        const inputOptions: string[] = ['-y', '-f concat', '-safe 0'];
        const outputOptions: string[] = ['-c copy', ...maps, '-ignore_unknown'];

        if (project.type === ProjectType.PROJECT_360 && !CONFIG.preservePCMAudio) {
          outputOptions.push('-c:a aac');
          outputOptions.push('-af channelmap=0');
        }

        ffmpeg(concatFilePath)
          .on('progress', (progress: { timemark: string }): void => {
            progressCb(progress);
          })
          .on('error', (error: Error, stdout: string | null, stderr: string | null): void => {
            reject({
              err: error,
              stdout: stdout,
              stderr: stderr
            });
          })
          .on('end', (): void => {
            processGyro(project)
              .then(resolve)
              .catch((error): void => {
                reject(error);
              });
          })
          .inputOptions(inputOptions)
          .outputOptions(outputOptions)
          .save(path.join(project.savePath, project.outputName));
      } catch (error) {
        reject(error);
      }
    })();
  });
};

/**
 * Function to generate project path
 *
 * @param project
 */
export const generateProjectDir = (project: Project): void => {
  if (CONFIG.exportOption === SavePathEnum.PROJECT_PATH) {
    const savePath: string = path.join(CONFIG.savePath, project.name);
    if (!fs.existsSync(savePath)) {
      fs.mkdirSync(savePath, { recursive: true });
    }

    project.savePath = savePath;
  } else if (CONFIG.exportOption === SavePathEnum.SOURCE_PATH) {
    project.savePath = project.absolutePath;
  }

  LOG.info(`Project path: ${project.savePath}`, LogTypeEnum.PROJECT, project.name);
};

/**
 * Function that generates output name for the project
 *
 * @param project
 */
export const generateOutputName = async (project: Project): Promise<void> => {
  let projectFileName: string = path.parse(project.files[0]).name;
  if (CONFIG.exportOption === SavePathEnum.PROJECT_PATH) projectFileName = project.name;

  const outputExt: string =
    CONFIG.preservePCMAudio && CONFIG.processingType === ProcessingTypeEnum.FFMPEG && project.type === ProjectType.PROJECT_360
      ? 'mov'
      : 'mp4';
  let outputName: string = `${projectFileName}_joined.${outputExt}`;

  const generateUniqueName = async (baseName: string, extension: string): Promise<string> => {
    const fileRegex: RegExp = new RegExp(`^${baseName}_joined(_\\d+)?\\.${extension}$`);
    let maxNumber: number = 0;

    const files: string[] = await readDirectory(project.savePath);
    files.forEach((file: string): void => {
      const fileName: string = path.basename(file);
      if (fileRegex.test(fileName)) {
        const match: RegExpMatchArray | null = fileName.match(/_joined(?:_(\d+))?/);
        const number: number = match && match[1] ? parseInt(match[1], 10) : 0;
        if (number >= maxNumber) {
          maxNumber = number + 1;
        }
      }
    });

    return maxNumber > 0 ? `${baseName}_joined_${maxNumber}.${extension}` : `${baseName}_joined.${extension}`;
  };

  if (fs.existsSync(path.join(project.savePath, outputName))) {
    outputName = await generateUniqueName(projectFileName, outputExt);
  }

  project.outputName = outputName;
  LOG.info(`Output name: ${project.outputName}`, LogTypeEnum.PROJECT, project.name);
};

const createConcatFile = (project: Project): string => {
  let concatText: string = '';
  project.filePaths.forEach((filePath: string): void => {
    concatText += "file '" + scapePath(filePath) + "'\n";
  });

  LOG.info(`Concat file content:\n ${concatText}`, LogTypeEnum.PROJECT, project.name);

  fs.writeFileSync(path.join(os.tmpdir(), `concat_${project.id}.txt`), concatText, 'utf-8');

  return path.join(os.tmpdir(), `concat_${project.id}.txt`);
};

const getAllStreamMaps = async (project: Project, concatFilePath: string): Promise<string[]> => {
  return new Promise((resolve, reject): void => {
    if (CONFIG.preservePCMAudio && project.type === ProjectType.PROJECT_360) {
      resolve(['0']);
    } else {
      const cmd: string = `"${ffmpegPath}" -f concat -safe 0 -i "${concatFilePath}" -y`;
      exec(cmd, { cwd: project.absolutePath }, function (_: unknown, __: string, stderr: string): void {
        try {
          const searchStr: string = 'Stream #0:';
          const streamMaps: string[] = [...stderr.matchAll(new RegExp(searchStr, 'gi'))].map((a): string =>
            a.input.substring(a.index + searchStr.length, a.index + searchStr.length + 1)
          );

          if (streamMaps.length === 0) reject('No stream maps found');
          resolve(streamMaps);
        } catch (e) {
          reject(e);
        }
      });
    }
  });
};
