import { MediaInfo, MediaItem, MediaNfo, MediaType, PopupSelect } from "./shared";

export interface ArchiveInfo {
    item: MediaItem;
    type: MediaType;
    nfo: MediaNfo;
}

export interface GeneralTask {
    id: string;
    ts: number;
    index: number;
    select: PopupSelect;
    info: ArchiveInfo;
}

export interface ProgressTask extends GeneralTask {
    progress: {

    }
}

interface Progress {
    gid?: string,
    disabled?: boolean,
    contentLength: number,
    chunkLength: number,
}