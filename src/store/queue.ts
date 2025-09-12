import { defineStore } from 'pinia';
import { Task, Scheduler } from '@/types/shared.d';

interface State {
  tasks: Record<string, Task>;
  schedulers: Record<string, Scheduler>;
  waiting: string[];
  doing: string[];
  complete: string[];
}

export const useQueueStore = defineStore('queue', {
  state: (): State => ({
    tasks: {},
    schedulers: {},
    waiting: [],
    doing: [],
    complete: [],
  }),
});
