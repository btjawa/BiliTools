import { defineStore } from "pinia";
import { QueueInfo } from "@/services/backend";

interface State {
    waiting: QueueInfo[],
    doing: QueueInfo[],
    complete: QueueInfo[],
}

export const useQueueStore = defineStore('queue', {
    state: (): State => ({
        waiting: [] as QueueInfo[],
        doing: [] as QueueInfo[],
        complete: [] as QueueInfo[],
    })
});