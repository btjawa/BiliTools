import { defineStore } from "pinia";
import { GeneralTask, ProgressTask } from "@/types/queue.d";

interface State {
    waiting: GeneralTask[],
    doing: ProgressTask[],
    complete: GeneralTask[],
}

export const useQueueStore = defineStore('queue', {
    state: (): State => ({
        waiting: [],
        doing: [],
        complete: [],
    })
});