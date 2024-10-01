import React from 'react';

import Notification from '@components/Notification/Notification';
import { NotificationContextProps, useNotification } from '@components/Notification/NotificationContext';
import { NotificationData } from '@components/Notification/NotificationData';

const NotificationContainer: React.FC = (): React.JSX.Element => {
  const { notifications, removeNotification }: NotificationContextProps = useNotification();

  return (
    <div className='notification-container'>
      {notifications.reverse().map((n: NotificationData): React.JSX.Element => {
        if (n.timeout > 0) {
          setTimeout((): void => removeNotification(n.id), n.timeout);
        }

        return (
          <Notification
            key={n.id}
            title={n.title}
            message={n.message}
            canClose={n.canClose}
            onClose={(): void => removeNotification(n.id)}
            onClick={n.onClick}
          />
        );
      })}
    </div>
  );
};

export default NotificationContainer;
