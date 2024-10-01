import crypto from 'node:crypto';

export const version: string = '1.4.0';
export const updateUrl: string = 'https://raw.githubusercontent.com/rubegartor/ReelSteady-Joiner/master/package.json';
export const isDev: boolean = process.env.NODE_ENV === 'development';

export const uuidv4 = (): string => {
  const array: Uint8Array = new Uint8Array(16);
  crypto.getRandomValues(array);

  array[6] = (array[6] & 0x0f) | 0x40;
  array[8] = (array[8] & 0x3f) | 0x80;
  return [...array]
    .map((byte: number, index: number): string => {
      return (index === 4 || index === 6 || index === 8 || index === 10 ? '-' : '') + byte.toString(16).padStart(2, '0');
    })
    .join('');
};

export const scapePath = (path: string): string => {
  return path.replace(/'/g, "'\\''");
};

export const convertTimemarkToSeconds = (timeString: string): number => {
  const [hours, minutes, seconds] = timeString.split(':');
  return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
};
