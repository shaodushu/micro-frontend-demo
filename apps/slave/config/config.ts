import { defineConfig } from 'umi';

export default defineConfig({
  npmClient: 'pnpm',
  base: '/slave',
  publicPath: '/slave/',
  plugins: ['@umijs/plugins/dist/qiankun'],
  qiankun: {
    slave: {},
  },
  routes: [
    { path: '/', component: 'index' },
  ],
  history: { type: 'browser' },
  title: '子应用',
  mfsu: false,
});
