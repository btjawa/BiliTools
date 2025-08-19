import { defineStore } from "pinia";
import { GeneralTask, TaskStatus } from "@/types/shared.d";

interface State {
    tasks: Record<string, GeneralTask>
    status: Record<string, TaskStatus>,
    waiting: string[],
    doing: string[],
    complete: string[],
    handled: string[],
}

export const useQueueStore = defineStore('queue', {
    state: (): State => ({
        tasks: {},
        status: {},
        waiting: [],
        doing: [],
        complete: [],
        handled: [],
    })
});