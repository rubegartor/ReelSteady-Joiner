import React from 'react';

import CloseIcon from '@components/Commons/Close';
import MinimizeIcon from '@components/Nav/Minimize';
import '@components/Nav/Nav.scss';

import { AppChannel } from '@src/AppChannel';

const isDarwin: boolean = window.electron.ipcRenderer.sendSync(AppChannel.GetPlatform) === 'darwin';

const Nav: React.FC = (): React.JSX.Element => {
  return (
    <div className='nav'>
      {isDarwin ? null : (
        <>
          <div className='control-box'>
            <MinimizeIcon
              color={'#533f0f'}
              onClick={(): void => {
                window.electron.ipcRenderer.send(AppChannel.MinimizeApp);
              }}
            />
            <CloseIcon
              color={'#78241b'}
              onClick={(): void => {
                window.electron.ipcRenderer.send(AppChannel.CloseApp);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Nav;
