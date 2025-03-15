export interface Message extends Record<string, any> {
  success: boolean;
  data?: any;
  message?: any;
}
