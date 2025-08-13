import { MediaInfo, MediaItem, MediaNfo, MediaType, PopupSelect, TaskType } from "./shared";

export interface ArchiveInfo {
    item: MediaItem;
    type: MediaType;
    nfo: MediaNfo;
}

export type TaskState = 'waiting' | 'doing' | 'complete' | 'paused' | 'failed' | 'cancelled';

export interface GeneralTask {
    id: string;
    ts: number;
    index: number;
    state: TaskState;
    select: PopupSelect;
    info: ArchiveInfo;
    status: Progress[];
}

interface Progress {
    parent: string,
    id: string,
    taskType: TaskType,
    contentLength: number,
    chunkLength: number,
}