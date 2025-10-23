import { createPinia } from 'pinia';

export { useAppStore } from './app';
export { useQueueStore } from './queue';
export { useSettingsStore } from './settings';
export { useUserStore } from './user';
export { useComponentsStore } from './components';

export default createPinia();
