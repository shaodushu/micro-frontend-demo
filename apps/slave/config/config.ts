import { defineConfig } from 'umi';

export default defineConfig({
  npmClient: 'pnpm',
  base: '/slave',
  publicPath: '/slave/',
  routes: [
    { path: '/', component: 'index' },
    { path: '/list', component: 'list' },
    { path: '/detail', component: 'detail' },
    { path: '/callback', component: 'callback', layout: false },
  ],
  history: { type: 'browser' },
  title: '子应用',
  mfsu: false,
  proxy: {
    '/api/slave/': {
      target: 'http://localhost:9000',
      changeOrigin: true,
    },
  },
});
