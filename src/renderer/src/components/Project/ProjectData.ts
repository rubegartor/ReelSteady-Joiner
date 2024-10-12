export interface ProjectData {
  id: string;
  uniqueFileId: string;
  files: string[];
  absolutePath: string;
  savePath: string;
  name: string;
  type: string;
  thumbnail: string;
  duration: number;
  modifiedDate: number;
  failed: boolean;
  progress: number;
  available: boolean;
  completed: boolean;
}
