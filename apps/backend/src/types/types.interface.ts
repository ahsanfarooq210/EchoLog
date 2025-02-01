export interface Err {
  status: number;
  name: string;
  path: string;
  param: string;
  message: string;
  type: string;
}

export interface ICustomError {
  status?: number;
  message?: string;
}
