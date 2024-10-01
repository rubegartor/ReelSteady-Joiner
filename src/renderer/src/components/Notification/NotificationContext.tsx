import React, { ReactNode, createContext, useContext, useState } from 'react';

import { NotificationData } from '@components/Notification/NotificationData';

export interface NotificationContextProps {
  notifications: NotificationData[];
  addNotification: (notification: NotificationData) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext: React.Context<NotificationContextProps | undefined> = createContext<NotificationContextProps | undefined>(
  undefined
);

export const useNotification = (): NotificationContextProps => {
  const context: NotificationContextProps | undefined = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }: { children: ReactNode }): React.JSX.Element => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const addNotification = (notification: NotificationData): void => {
    setNotifications((prevNotifications): NotificationData[] => [...prevNotifications, notification]);
  };

  const removeNotification = (id: string): void => {
    setNotifications((prevNotifications): NotificationData[] =>
      prevNotifications.filter((notification): boolean => notification.id !== id)
    );
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>{children}</NotificationContext.Provider>
  );
};
