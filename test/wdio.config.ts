export const config: object = {
  specs: ['./e2e/*.e2e.ts'],
  services: [
    [
      'electron',
      {
        appBinaryPath: './dist/win-unpacked/ReelSteady Joiner.exe'
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
