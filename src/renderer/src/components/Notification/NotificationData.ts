export interface NotificationData {
  id: string;
  title: string;
  message: string;
  timeout: number;
  canClose: boolean;
  onClick?: () => void;
}
