import React, { RefObject, useEffect, useRef } from 'react';

import '@components/Menu/ContextMenu.scss';

import OpenIcon from '@assets/open';
import TrashIcon from '@assets/trash';

export const ContextMenuYOffset: number = 45;
export const ContextMenuXOffset: number = 5;

interface ContextMenuProps {
  x: number;
  y: number;
  onOpen: () => void;
  onClose: () => void;
  onRemove: () => void;
  canRemove: boolean;
}

enum ContextMenuColors {
  // References colors.scss
  white = '#ebe5d6',
  red = '#c0392b'
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, onOpen, onRemove, canRemove }: ContextMenuProps): React.JSX.Element => {
  const menuRef: RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);

  useEffect((): (() => void) => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (menuRef.current) {
      const menuHeight: number = menuRef.current.clientHeight;
      const menuWidth: number = menuRef.current.clientWidth;

      if (y + ContextMenuYOffset + menuHeight > window.innerHeight) {
        y = y - menuHeight;
      }

      if (x + ContextMenuXOffset + menuWidth > window.innerWidth) {
        x = x - menuWidth;
      }

      menuRef.current.style.top = `${y}px`;
      menuRef.current.style.left = `${x}px`;
    }

    document.addEventListener('mousedown', handleClickOutside);

    return (): void => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [x, y, onClose]);

  return (
    <div
      id='contextmenu'
      className='contextmenu'
      style={{ top: y, left: x }}
      ref={menuRef}
      onContextMenu={(e: React.MouseEvent): void => e.preventDefault()}
    >
      <ul className='menu-options'>
        <li
          className='menu-option'
          onClick={(): void => {
            onClose();
            onOpen();
          }}
        >
          <OpenIcon color={ContextMenuColors.white} />
          Open
        </li>
        {canRemove ? (
          <>
            <li className='menu-separator' />
            <li className='menu-option' onClick={(): void => onRemove()}>
              <TrashIcon color={ContextMenuColors.red} />
              Remove
            </li>
          </>
        ) : null}
      </ul>
    </div>
  );
};
export default ContextMenu;
