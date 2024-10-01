import React, { useCallback, useState } from 'react';

interface CloseIconProps {
  color?: string;
  onClick: (event: React.MouseEvent) => void;
}

const CloseIcon: React.FC<CloseIconProps> = ({ color = '', onClick }: CloseIconProps): React.JSX.Element => {
  const [hover, setHover] = useState(false);

  const handleMouseEnter: () => void = useCallback((): void => setHover(true), []);
  const handleMouseLeave: () => void = useCallback((): void => setHover(false), []);

  return (
    <div className='close' onClick={onClick} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {hover ? (
        <svg viewBox='0 0 1024 1024' xmlns='http://www.w3.org/2000/svg' fill={color}>
          <g id='SVGRepo_bgCarrier' strokeWidth='0'></g>
          <g id='SVGRepo_tracerCarrier' strokeLinecap='round' strokeLinejoin='round'></g>
          <g id='SVGRepo_iconCarrier'>
            <path
              fill={color}
              d='M195.2 195.2a64 64 0 0 1 90.496 0L512 421.504 738.304 195.2a64 64 0 0 1 90.496 90.496L602.496 512 828.8 738.304a64 64 0 0 1-90.496 90.496L512 602.496 285.696 828.8a64 64 0 0 1-90.496-90.496L421.504 512 195.2 285.696a64 64 0 0 1 0-90.496z'
            ></path>
          </g>
        </svg>
      ) : (
        ''
      )}
    </div>
  );
};

export default CloseIcon;
