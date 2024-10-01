import React, { ChangeEvent, useEffect, useState } from 'react';

import '@components/Settings/ConfigBox.scss';

interface SpinConfigBoxProps {
  title: string;
  description?: string;
  value: number;
  range: { min: number; max: number };
  editable: boolean;
  disabled?: boolean;
  callback?: (num: number) => void;
}

const SpinConfigBox: React.FC<SpinConfigBoxProps> = ({
  title,
  description,
  value,
  range,
  editable,
  disabled,
  callback
}: SpinConfigBoxProps): React.JSX.Element => {
  const [inputValue, setInputValue] = useState(value);

  useEffect((): void => {
    if (callback) {
      callback(inputValue);
    }
  }, [inputValue, callback]);

  const increment = (): void => {
    setInputValue((prevValue: number): number => (prevValue >= range.max ? range.max : prevValue + 1));
  };

  const decrement = (): void => {
    setInputValue((prevValue: number): number => (prevValue <= range.min ? range.min : prevValue - 1));
  };

  const setValue = (event: ChangeEvent<HTMLInputElement>): void => {
    const value: number = parseInt(event.target.value);

    if (value >= range.min && value <= range.max) {
      setInputValue(value);
    } else if (value < range.min) {
      setInputValue(range.min);
    } else if (value > range.max) {
      setInputValue(range.max);
    }
  };

  return (
    <div className='configBox'>
      <div className='configRow'>
        <div className='configInfo'>
          <div className='name'>{title}</div>
          <div className='description'>{description}</div>
        </div>
        <div className='configType'>
          <button type='button' className='btn-number-input-l btn-number-input-winfix' disabled={disabled} onClick={decrement}>
            -
          </button>
          <input type='text' className='input-number' value={inputValue} disabled={disabled} onChange={setValue} readOnly={!editable} />
          <button type='button' className='btn-number-input-r btn-number-input-winfix' disabled={disabled} onClick={increment}>
            +
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpinConfigBox;
