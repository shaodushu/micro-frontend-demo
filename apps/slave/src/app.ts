export const qiankun = {
  async bootstrap(props: any) {
    console.log('[slave-app] bootstrap', props);
  },
  async mount(props: any) {
    console.log('[slave-app] mount', props);
    if (typeof window !== 'undefined') {
      (window as any).__QIANKUN_SLAVE_PROPS__ = props;
      window.dispatchEvent(new CustomEvent('qiankun-props-update'));
    }
  },
  async update(props: any) {
    console.log('[slave-app] update', props);
    if (typeof window !== 'undefined') {
      (window as any).__QIANKUN_SLAVE_PROPS__ = props;
      window.dispatchEvent(new CustomEvent('qiankun-props-update'));
    }
  },
  async unmount(props: any) {
    console.log('[slave-app] unmount', props);
  },
};
