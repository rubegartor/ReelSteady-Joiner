import React, { ChangeEvent, useEffect, useState } from 'react';

import '@components/Settings/ConfigBox.scss';

interface ConfigBoxProps {
  title: string;
  description?: string;
  value?: boolean;
  disabled?: boolean;
  callback?: (checked: boolean) => void;
}

const SwitchConfigBox: React.FC<ConfigBoxProps> = ({
  title,
  description,
  value,
  disabled,
  callback
}: ConfigBoxProps): React.JSX.Element => {
  const [checked, setCheckedValue] = useState<boolean | undefined>(value);

  useEffect((): void => {
    if (callback) {
      callback(checked !== undefined ? checked : false);
    }
  }, [checked, callback]);

  const switchChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setCheckedValue(event.target.checked);
  };

  return (
    <div className='configBox'>
      <div className='configRow'>
        <div className='configInfo'>
          <div className='name'>{title}</div>
          <div className='description'>{description}</div>
        </div>
        <div className='configType'>
          <label className='switch'>
            <input type='checkbox' disabled={disabled} onChange={switchChange} checked={checked} />
            <span className='slider round'></span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default SwitchConfigBox;
