import { getToken, getUserInfo } from '@/utils/auth';

export const qiankun = () => {
  return {
    apps: [
      {
        name: 'slave-app',
        entry: '//localhost:8001/slave/',
      },
    ],
  };
};
