import React, { ChangeEvent, useEffect, useState } from 'react';

import '@components/Settings/ConfigBox.scss';

import { AppChannel } from '@src/AppChannel';

interface SelectConfigBoxProps {
  title: string;
  description?: string;
  value: string;
  options: object;
  disabled?: boolean;
  selectCallback?: (event: ChangeEvent<HTMLSelectElement>) => void;
  inputCallback?: (event: ChangeEvent<HTMLInputElement>) => void;
}

const SelectConfigBox: React.FC<SelectConfigBoxProps> = ({
  title,
  description,
  value,
  options,
  disabled,
  selectCallback,
  inputCallback
}: SelectConfigBoxProps): React.JSX.Element => {
  const [option, setOption] = useState(value);
  const [path, setPath] = useState(window.electron.ipcRenderer.sendSync(AppChannel.GetConfig).savePath);

  useEffect((): void => {
    if (selectCallback) {
      selectCallback({
        target: { value: option }
      } as ChangeEvent<HTMLSelectElement>);
    }
  }, [option, selectCallback]);

  useEffect((): void => {
    if (inputCallback) {
      inputCallback({
        target: { value: path }
      } as ChangeEvent<HTMLInputElement>);
    }
  }, [path, inputCallback]);

  const onOptionChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    setOption(event.target.value);
  };

  const searchSavePath = (): void => {
    window.electron.ipcRenderer.invoke(AppChannel.OpenDialog).then((path): void => {
      if (path !== undefined) setPath(path);
    });
  };

  return (
    <div className='configBox'>
      <div className='configRow'>
        <div className='configInfo'>
          <div className='name'>{title}</div>
          <div className='description'>{description}</div>
        </div>
        <div className='configType'>
          <select onChange={onOptionChange} defaultValue={option} disabled={disabled}>
            {Object.values(options).map(
              (option: string, index: number): React.JSX.Element => (
                <option key={index} value={Object.keys(options)[index]}>
                  {option}
                </option>
              )
            )}
          </select>
        </div>
      </div>
      <div
        className={`configRow ${inputCallback !== undefined && option === window.electron.ipcRenderer.sendSync(AppChannel.GetConfig).SavePathEnum.PROJECT_PATH ? '' : 'hide'}`}
      >
        <input type='text' value={path} className='w-100' disabled={disabled} readOnly />
        <button type='button' className='button-sm button-orange' onClick={searchSavePath} disabled={disabled}>
          ...
        </button>
      </div>
    </div>
  );
};

export default SelectConfigBox;
