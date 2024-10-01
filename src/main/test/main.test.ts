import '@main/main';

if (process.env.NODE_ENV === 'test') {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  import('wdio-electron-service/main');
}
