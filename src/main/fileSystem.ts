import fs from 'fs/promises';
import { Stats } from 'node:fs';
import path from 'node:path';

import { CONFIG } from '@main/app';

enum GoProModel {
  HERO5LOW = 'hero5-',
  HERO5HIGH = 'hero+',
  HEROMAX = 'max',
  NONE = ''
}

// Core matching regexes (allow optional custom prefix before the GoPro code)
const HERO5LOWRegex: RegExp = /.*(G(?:OPR)?P?\d{4,6})\.(mp4|MP4)$/i;
const HERO5HIGHRegex: RegExp = /.*(G[PHXS]?\d{6,7})\.(mp4|MP4)$/i;
const MAXRegex: RegExp = /.*(GS?\d{6,7})\.360$/i;

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

// Extract core GoPro naming info from a filename (supports custom prefixes)
const extractGoProCore = (
  fileName: string
): { model: GoProModel; core: string; code2: string; digits: string } | null => {
  // Try to match MAX first (distinct extension), then HERO5LOW, then HERO5HIGH
  let match: RegExpMatchArray | null = fileName.match(MAXRegex);
  if (match) {
    const core: string = match[1]; // e.g., GS0123456
    const code2: string = core.substring(0, 2).toUpperCase();
    const digits: string = core.replace(/^GS?/i, '');
    return { model: GoProModel.HEROMAX, core, code2, digits };
  }

  match = fileName.match(HERO5LOWRegex);
  if (match) {
    const core: string = match[1]; // e.g., GOPR0123 or GP012345
    const code2: string = core.substring(0, 2).toUpperCase();
    const digits: string = core.replace(/^G(?:OPR)?P?/i, '');
    return { model: GoProModel.HERO5LOW, core, code2, digits };
  }

  match = fileName.match(HERO5HIGHRegex);
  if (match) {
    const core: string = match[1]; // e.g., GX010117 or GH010117
    const code2: string = core.substring(0, 2).toUpperCase();
    const digits: string = core.replace(/^G[PHXS]?/i, '');
    return { model: GoProModel.HERO5HIGH, core, code2, digits };
  }

  return null;
};

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
  const extracted = extractGoProCore(fileName);
  return extracted ? extracted.model : GoProModel.NONE;
};

const isGoProFile = (file: string): boolean => {
  // Accept files that match any GoPro core pattern, regardless of custom prefix length
  return extractGoProCore(file) !== null;
};

export const loadFiles = async (folderPath: string): Promise<FileGroups> => {
  const files: string[] = await readDirectory(folderPath);

  const goProFilesPath: FileGroups = files.reduce((acc: FileGroups, goProFilePath: string): FileGroups => {
    const goProFileName: string = path.basename(goProFilePath);

    if (isGoProFile(goProFileName)) {
      const filePath: string = path.parse(goProFilePath).dir;
      const extracted = extractGoProCore(goProFileName)!;
      const last4: string = extracted.digits.slice(-4);
      const uniqueFileId: string = `${extracted.code2}${last4}`;
      const key: string = `${uniqueFileId}_${filePath}`;

      if (!acc[key]) {
        acc[key] = {
          model: extracted.model,
          absolutePath: filePath,
          relativePath: path.relative(folderPath, filePath),
          files: []
        };
      }

      acc[key].files.push(goProFileName);
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
    const extracted = extractGoProCore(file);
    const model: GoProModel = extracted ? extracted.model : GoProModel.NONE;
    const digits: string = extracted ? extracted.digits : '';
    // Chapter number is the first two digits after the GoPro code
    const chapterNum: number = digits.length >= 2 && !isNaN(Number(digits.substring(0, 2))) ? parseInt(digits.substring(0, 2)) : NaN;
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
  const extracted = extractGoProCore(chapterFile);
  const digits: string = extracted ? extracted.digits : '';
  return digits.length >= 2 && !isNaN(Number(digits.substring(0, 2))) ? parseInt(digits.substring(0, 2)) : NaN;
};
