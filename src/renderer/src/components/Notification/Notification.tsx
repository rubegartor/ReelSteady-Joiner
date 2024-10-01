import React from 'react';

import CloseIcon from '@components/Commons/Close';
import '@components/Notification/Notification.scss';

interface NotificationProps {
  title: string;
  message: string;
  canClose: boolean;
  onClick?: () => void;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({
  title,
  message,
  canClose,
  onClose,
  onClick
}: NotificationProps): React.JSX.Element => {
  return (
    <div className={`notification ${onClick !== undefined ? ' clickable' : ''}`} onClick={onClick}>
      <div className='title'>
        {title}
        {canClose ? (
          <div className='notification-close'>
            <CloseIcon
              color={'#78241b'}
              onClick={(e): void => {
                e.stopPropagation();
                onClose();
              }}
            />
          </div>
        ) : null}
      </div>
      <div className='message'>{message}</div>
    </div>
  );
};

export default Notification;
