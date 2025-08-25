import { defineStore } from "pinia";
import { GeneralTask, TaskStatus } from "@/types/shared.d";

interface State {
    tasks: Record<string, GeneralTask>
    status: Record<string, TaskStatus>,
    seq: 0,
    waiting: string[],
    doing: string[],
    complete: string[],
    handled: string[],
}

export const useQueueStore = defineStore('queue', {
    state: (): State => ({
        tasks: {},
        status: {},
        seq: 0,
        waiting: [],
        doing: [],
        complete: [],
        handled: [],
    })
});