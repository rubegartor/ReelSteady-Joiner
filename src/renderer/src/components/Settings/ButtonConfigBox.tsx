import React from 'react';

import '@components/Settings/ConfigBox.scss';

interface ButtonConfigBoxProps {
  title: string;
  description?: string;
  buttonText: string;
  callback?: () => void;
}

const ButtonConfigBox: React.FC<ButtonConfigBoxProps> = ({
  title,
  description,
  buttonText,
  callback
}: ButtonConfigBoxProps): React.JSX.Element => {
  return (
    <div className='configBox'>
      <div className='configRow'>
        <div className='configInfo'>
          <div className='name'>{title}</div>
          <div className='description'>{description}</div>
        </div>
        <div className='configType'>
          <button type='button' className='button-orange' onClick={callback}>
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ButtonConfigBox;
