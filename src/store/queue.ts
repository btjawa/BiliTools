import { defineStore } from "pinia";
import { GeneralTask } from "@/types/queue.d";

interface State {
    tasks: GeneralTask[]
    waiting: string[],
    doing: string[],
    complete: string[]
}

export const useQueueStore = defineStore('queue', {
    state: (): State => ({
        tasks: [],
        waiting: [],
        doing: [],
        complete: [],
    })
});