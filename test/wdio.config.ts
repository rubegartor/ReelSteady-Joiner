import { join } from 'path';
import { app } from 'electron';

const getAppBinaryPath = (): string => {
  const basePath = './dist';
  const appName = 'ReelSteady Joiner.app/Contents/MacOS/ReelSteady Joiner';

  switch (process.platform) {
    case 'darwin':
      return process.arch === 'arm64'
        ? join(basePath, 'mac-arm64', appName)
        : join(basePath, 'mac-x64', appName);
    case 'win32':
      return join(basePath, 'win', 'ReelSteadyJoiner.exe');
    default:
      throw new Error('Unsupported platform');
  }
};


let binaryPath = undefined;

switch (process.platform) {
  case 'darwin':
    const arch: string = process.arch === 'arm64' ? 'mac-arm64' : 'mac';

    binaryPath = `./dist/${arch}/ReelSteady Joiner.app/Contents/MacOS/ReelSteady Joiner`;
    break;
  case 'win32':
    binaryPath = './dist/win-unpacked/ReelSteady Joiner.exe';
    break;
  default:
    throw new Error('Unsupported platform');
}

export const config: object = {
  specs: ['./e2e/*.e2e.ts'],
  services: [
    [
      'electron',
      {
        appBinaryPath: binaryPath
      }
    ]
  ],
  capabilities: [
    {
      browserName: 'electron'
    }
  ],
  logLevel: 'silent',
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 80000
  }
};
