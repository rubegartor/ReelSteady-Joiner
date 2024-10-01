import React from 'react';

interface TrashIconProps {
  color?: string;
}

const TrashIcon = ({ color = '' }: TrashIconProps): React.JSX.Element => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='16px' height='16px' className='icon'>
    <path
      style={{
        fill: 'none',
        stroke: color,
        strokeWidth: '2',
        strokeLinecap: 'round',
        strokeMiterlimit: '10'
      }}
      d='M20,4H4'
    />
    <path style={{ fill: color }} d='M15,3v1H9V3l0.429-0.429C9.795,2.205,10.29,2,10.807,2h2.386c0.517,0,1.012,0.205,1.377,0.571L15,3z' />
    <path
      style={{ fill: color }}
      d='M4.366,7l1.527,13.264C6.025,21.254,6.877,22,7.875,22h8.249c0.998,0,1.85-0.746,1.983-1.745L19.634,7H4.366z'
    />
  </svg>
);

export default TrashIcon;
