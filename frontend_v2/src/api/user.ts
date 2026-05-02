import client from './client';

export const login = (username: string, password: string) =>
  client.post<{ token: string; user_id: number; username: string }>('/users/login', { username, password }).then(r => r.data);
