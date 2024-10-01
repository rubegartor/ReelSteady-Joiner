import React from 'react';

interface OpenIconProps {
  color?: string;
}

const OpenIcon = ({ color = '' }: OpenIconProps): React.JSX.Element => (
  <svg
    version='1.1'
    xmlns='http://www.w3.org/2000/svg'
    xmlnsXlink='http://www.w3.org/1999/xlink'
    x='0px'
    y='0px'
    viewBox='0 0 48 48'
    width='16px'
    height='16px'
    className='icon'
    xmlSpace='preserve'
  >
    <path
      style={{
        fill: 'none',
        stroke: color,
        strokeWidth: '4',
        strokeLinecap: 'round',
        strokeMiterlimit: '10'
      }}
      d='M22,10h-9.5C9.468,10,7,12.468,7,15.5v20c0,3.032,2.468,5.5,5.5,5.5h20c3.032,0,5.5-2.468,5.5-5.5V26'
    />
    <line
      style={{
        fill: 'none',
        stroke: color,
        strokeWidth: '4',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeMiterlimit: '10'
      }}
      x1='24'
      y1='24'
      x2='41'
      y2='7'
    />
    <polyline
      style={{
        fill: 'none',
        stroke: color,
        strokeWidth: '4',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeMiterlimit: '10'
      }}
      points='28,7 41,7 41,20'
    />
  </svg>
);

export default OpenIcon;
