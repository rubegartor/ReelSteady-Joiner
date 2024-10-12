import React, { ChangeEvent, RefObject, useEffect, useRef, useState } from 'react';

import '@renderer/commons/commons.scss';

import ButtonConfigBox from '@components/Settings/ButtonConfigBox';
import SelectConfigBox from '@components/Settings/SelectConfigBox';
import '@components/Settings/Settings.scss';
import SpinConfigBox from '@components/Settings/SpinConfigbox';
import SwitchConfigBox from '@components/Settings/SwitchConfigBox';

import chevron from '@assets/chevron.png';

import { AppChannel } from '@src/AppChannel';

interface SettingsProps {
  toggle: () => void;
  disabled: boolean;
}

const isDarwin: boolean = window.electron.ipcRenderer.sendSync(AppChannel.GetPlatform) === 'darwin';

const Settings: React.FC<SettingsProps> = ({ toggle, disabled }: SettingsProps): React.JSX.Element => {
  const [showPCMSetting, setShowPCMSetting] = useState(false);
  const configsContainerRef: RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);
  const [hasScrollbar, setScrollbar] = useState(false);

  const updateConfig = (key: string, value: number | string | boolean): void => {
    window.electron.ipcRenderer.send(AppChannel.UpdateConfig, {
      key,
      value
    });
  };

  useEffect((): (() => void) => {
    const container: HTMLDivElement | null = configsContainerRef.current;
    const adjustMargin = (): void => {
      if (container) {
        setScrollbar(container.scrollHeight > container.clientHeight);
      }
    };

    const observer: ResizeObserver = new ResizeObserver((): void => {
      adjustMargin();
    });

    if (container) {
      observer.observe(container);
    }

    return (): void => {
      if (container) observer.unobserve(container);
    };
  }, [configsContainerRef]);

  return (
    <div className='container' id='settings'>
      <div className={`title ${isDarwin ? 'title-mac' : 'title-win'}`}>
        <div className='goBack' onClick={toggle}>
          <img src={chevron} alt={''} />
        </div>
        <div className='text'>Settings</div>
      </div>
      <div className={`configsContainer ${hasScrollbar ? 'has-scrollbar' : ''}`} ref={configsContainerRef}>
        <SelectConfigBox
          title='Project save path'
          description='Method to export video files'
          options={{
            [window.electron.ipcRenderer.sendSync(AppChannel.GetConfig).SavePathEnum.PROJECT_PATH]: 'Select project save path',
            [window.electron.ipcRenderer.sendSync(AppChannel.GetConfig).SavePathEnum.SOURCE_PATH]: 'Export to source path'
          }}
          value={window.electron.ipcRenderer.sendSync(AppChannel.GetConfig).exportOption}
          disabled={disabled}
          selectCallback={(event: ChangeEvent): void => {
            updateConfig('exportOption', (event.target as HTMLSelectElement).value);
          }}
          inputCallback={(event: ChangeEvent): void => {
            updateConfig('savePath', (event.target as HTMLTextAreaElement).value);
          }}
        />
        <SelectConfigBox
          title='Processing type'
          description='Method to use to merge video files (MP4Merge recommended)'
          options={{
            [window.electron.ipcRenderer.sendSync(AppChannel.GetConfig).ProcessingTypeEnum.MP4MERGE]: 'MP4Merge',
            [window.electron.ipcRenderer.sendSync(AppChannel.GetConfig).ProcessingTypeEnum.FFMPEG]: 'FFmpeg'
          }}
          value={window.electron.ipcRenderer.sendSync(AppChannel.GetConfig).processingType}
          disabled={disabled}
          selectCallback={(event: ChangeEvent): void => {
            updateConfig('processingType', (event.target as HTMLSelectElement).value);
            setShowPCMSetting(
              window.electron.ipcRenderer.sendSync(AppChannel.GetConfig).processingType ===
                window.electron.ipcRenderer.sendSync(AppChannel.GetConfig).ProcessingTypeEnum.FFMPEG
            );
          }}
        />
        <SpinConfigBox
          title='Projects queue'
          description='Number of projects that can be processed at the same time (Max: 5)'
          value={window.electron.ipcRenderer.sendSync(AppChannel.GetConfig).concurrentProjects}
          range={{ min: 1, max: 5 }}
          editable={false}
          disabled={disabled}
          callback={(num: number): void => {
            updateConfig('concurrentProjects', num);
          }}
        />
        {showPCMSetting ? (
          <SwitchConfigBox
            title='Preserve PCM audio'
            description='If enabled, 360 files will be processed using the mov format, retain PCM audio
                        and the file will be slightly larger'
            value={window.electron.ipcRenderer.sendSync(AppChannel.GetConfig).preservePCMAudio}
            disabled={disabled}
            callback={(checked: boolean): void => updateConfig('preservePCMAudio', checked)}
          />
        ) : null}
        <SpinConfigBox
          title='Path depth'
          description='Number of folders to search for video files'
          value={window.electron.ipcRenderer.sendSync(AppChannel.GetConfig).pathDepth}
          range={{ min: 0, max: 100 }}
          editable={true}
          disabled={disabled}
          callback={(num: number): void => {
            updateConfig('pathDepth', num);
          }}
        />
        <ButtonConfigBox
          title='Open logs'
          description='Open the logs file'
          buttonText='Open logs'
          callback={(): void => window.electron.ipcRenderer.send(AppChannel.OpenLog)}
        />
      </div>
    </div>
  );
};

export default Settings;
