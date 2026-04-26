import { defineConfig } from 'umi';

export default defineConfig({
  npmClient: 'pnpm',
  mfsu: false,
  plugins: ['@umijs/plugins/dist/qiankun'],
  qiankun: {
    master: {
      apps: [
        {
          name: 'slave-app',
          entry: '//localhost:8001/slave/',
        },
      ],
    },
  },
  routes: [
    { path: '/', component: 'index' },
    { path: '/slave/*', component: 'slave' },
    { path: '/login', component: 'login', layout: false },
    { path: '/callback', component: 'callback', layout: false },
  ],
  history: { type: 'browser' },
  title: '主应用',
});
