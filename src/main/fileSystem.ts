import fs from 'fs/promises';
import { Stats } from 'node:fs';
import path from 'node:path';

import { CONFIG } from '@main/app';

export enum GoProModel {
  HERO5LOW = 'hero5-',
  HERO5HIGH = 'hero+',
  HEROMAX = 'max',
  NONE = ''
}

const GOPRO_FILE_LENGTH: number = 12;
const HERO5LOWRegex: RegExp = /^G(OPR)?P?\d{4,6}\.(mp4|MP4)$/i;
const HERO5HIGHRegex: RegExp = /^G[PHXS]?\d{6,7}\.(mp4|MP4)$/i;
const MAXRegex: RegExp = /^GS?\d{6,7}\.360$/i;

interface GoProFile {
  file: string;
  model: GoProModel;
  chapterNum: number;
}

export interface FileGroup {
  model: GoProModel;
  absolutePath: string;
  relativePath: string;
  files: string[];
}

export interface FileGroups {
  [key: string]: FileGroup;
}

export const readDirectory = async (dir: string, depth: number = 0): Promise<string[]> => {
  let dirContent: string[] = [];

  if (depth > CONFIG.pathDepth) {
    return dirContent;
  }

  try {
    const files: string[] = await fs.readdir(dir);
    for (const file of files) {
      const filePath: string = path.join(dir, file);
      const stat: Stats = await fs.stat(filePath);
      if (stat.isDirectory()) {
        const nestedDirContent: string[] = await readDirectory(filePath, depth + 1);
        dirContent = dirContent.concat(nestedDirContent);
      } else {
        dirContent.push(filePath);
      }
    }
  } catch (_) {
    //Errors omitted like EPERM, EBUSY, etc.
  }

  return dirContent;
};

const identifyGoProModel = (fileName: string): GoProModel => {
  const modelMap: { [key: string]: GoProModel } = {
    GH: GoProModel.HERO5HIGH,
    GX: GoProModel.HERO5HIGH,
    GS: GoProModel.HEROMAX,
    GOPR: GoProModel.HERO5LOW,
    GP: GoProModel.HERO5LOW
  };

  for (const prefix in modelMap) {
    if (fileName.startsWith(prefix)) {
      return modelMap[prefix];
    }
  }

  return GoProModel.NONE;
};

const isGoProFile = (file: string): boolean => {
  const modelRegexMap: { [key in GoProModel]: RegExp | null } = {
    [GoProModel.HERO5LOW]: HERO5LOWRegex,
    [GoProModel.HERO5HIGH]: HERO5HIGHRegex,
    [GoProModel.HEROMAX]: MAXRegex,
    [GoProModel.NONE]: null
  };

  const model: GoProModel = identifyGoProModel(file);
  const rgx: RegExp | null = modelRegexMap[model];

  return rgx ? file.length === GOPRO_FILE_LENGTH && rgx.test(file) : false;
};

export const loadFiles = async (folderPath: string): Promise<FileGroups> => {
  const files: string[] = await readDirectory(folderPath);

  const goProFilesPath: FileGroups = files.reduce((acc: FileGroups, goProFilePath: string): FileGroups => {
    const goProFileName: string = path.basename(goProFilePath);

    if (isGoProFile(goProFileName)) {
      const filePath: string = path.parse(goProFilePath).dir;
      const fileNumber: string = goProFileName.substring(4, 8);

      if (!acc[fileNumber]) {
        acc[fileNumber] = {
          model: identifyGoProModel(goProFileName),
          absolutePath: filePath,
          relativePath: path.relative(folderPath, filePath),
          files: []
        };
      }

      acc[fileNumber].files.push(goProFileName);
    }

    return acc;
  }, {});

  for (const key in goProFilesPath) {
    const sortedFiles: string[] = sortGoProNames(goProFilesPath[key].files);
    const chapterNums: number[] = sortedFiles.map(getChapterNum).sort((a: number, b: number): number => a - b);

    if (
      chapterNums.length < 2 ||
      !chapterNums.every((num: number, i: number, arr: number[]): boolean => i === 0 || num === arr[i - 1] + 1)
    ) {
      delete goProFilesPath[key];
    } else {
      goProFilesPath[key].files = sortedFiles;
    }
  }

  return goProFilesPath;
};

const sortGoProNames = (arr: string[]): string[] => {
  const precomputed: GoProFile[] = arr.map((file: string): GoProFile => {
    const model: GoProModel = identifyGoProModel(file);
    const chapterNum: number = isNaN(Number(file.substring(1, 4))) ? parseInt(file.substring(2, 4)) : parseInt(file.substring(1, 4));
    return { file, model, chapterNum };
  });

  return precomputed
    .sort((a: GoProFile, b: GoProFile): number => {
      if (a.model === GoProModel.HERO5LOW && b.model !== GoProModel.HERO5LOW) {
        return 1;
      }

      if (b.model === GoProModel.HERO5LOW && a.model !== GoProModel.HERO5LOW) {
        return -1;
      }

      return a.chapterNum - b.chapterNum;
    })
    .map((item: GoProFile): string => item.file);
};

const getChapterNum = (chapterFile: string): number => {
  const model: GoProModel = identifyGoProModel(chapterFile);
  let chapterNum: number;

  if (model === GoProModel.HERO5LOW && !chapterFile.startsWith('GOPR')) {
    chapterNum = isNaN(Number(chapterFile.substring(1, 4))) ? parseInt(chapterFile.substring(2, 4)) : parseInt(chapterFile.substring(1, 4));
  } else {
    chapterNum = isNaN(Number(chapterFile.substring(1, 4))) ? parseInt(chapterFile.substring(2, 4)) : parseInt(chapterFile.substring(1, 4));
  }

  return chapterNum;
};
