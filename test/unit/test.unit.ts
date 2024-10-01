import { convertTimemarkToSeconds, scapePath, uuidv4 } from '../../src/main/util';

test('UUIDv4', async (): Promise<void> => {
  const uuidv4Regex: RegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  expect(uuidv4Regex.test(uuidv4())).toBe(true);
});

test('Scape FFmpeg path', async (): Promise<void> => {
  expect(scapePath("'  whitespaces  '")).toBe("'\\''  whitespaces  '\\''");
  expect(scapePath("ReelSteady's files")).toBe("ReelSteady'\\''s files");
});

test('Timemark to seconds', async (): Promise<void> => {
  expect(convertTimemarkToSeconds('12:00:23')).toBe(43223);
});
