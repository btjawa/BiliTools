import { EdgeChoice, EdgeStory, EdgeVar } from './media/extras.d';

export const QualityMap = {
  res: [6, 16, 32, 64, 80, 112, 116, 120, 125, 126, 127],
  abr: [30216, 30228, 30232, 30280, 30250, 30380, 30251, 30252],
  enc: [7, 12, 13],
  fmt: [StreamFormat.Dash, StreamFormat.Mp4, StreamFormat.Flv],
};

export const NamingTemplates = {
  series: {
    general: ['showtitle', 'container'] as const,
    down: ['pubtime', 'downtime', 'upper', 'upperid'] as const,
    ids: ['aid', 'sid', 'fid', 'cid', 'bvid', 'epid', 'ssid', 'opid'] as const,
  },
  item: {
    general: ['showtitle', 'title', 'container', 'mediaType'] as const,
    down: ['index', 'pubtime', 'downtime', 'upper', 'upperid'] as const,
    ids: ['aid', 'sid', 'fid', 'cid', 'bvid', 'epid', 'ssid', 'opid'] as const,
  },
  file: {
    general: [
      'showtitle',
      'title',
      'container',
      'mediaType',
      'taskType',
    ] as const,
    down: ['index', 'pubtime', 'downtime', 'upper', 'upperid'] as const,
    ids: ['aid', 'sid', 'fid', 'cid', 'bvid', 'epid', 'ssid', 'opid'] as const,
    stream: ['res', 'abr', 'enc', 'fmt'] as const,
  },
};

export interface PopupSelect {
  res?: number;
  abr?: number;
  enc?: number;
  fmt: StreamFormat;
  misc: {
    opusContent: boolean;
    aiSummary: boolean;
    subtitles: false | string;
  };
  nfo: {
    album: boolean;
    single: boolean;
  };
  danmaku: {
    live: boolean;
    history: false | string;
  };
  thumb: string[];
  media: {
    video: boolean;
    audio: boolean;
    audioVideo: boolean;
  };
}

export interface Headers {
  Cookie: string;
  'User-Agent': string;
  Referer: string;
  Origin: string;
  [key: string]: string;
}

export enum TaskType {
  OpusContent = 'opusContent',
  AISummary = 'aiSummary',
  Subtitles = 'subtitles',
  AlbumNfo = 'albumNfo',
  SingleNfo = 'singleNfo',
  LiveDanmaku = 'liveDanmaku',
  HistoryDanmaku = 'historyDanmaku',
  Thumb = 'thumb',
  Video = 'video',
  Audio = 'audio',
  AudioVideo = 'audioVideo',
}

export enum MediaType {
  Video = 'video',
  Bangumi = 'bangumi',
  Music = 'music',
  MusicList = 'musicList',
  Lesson = 'lesson',
  WatchLater = 'watchLater',
  Favorite = 'favorite',
  Opus = 'opus',
  UserVideo = 'userVideo',
  UserOpus = 'userOpus',
  UserAudio = 'userAudio',
}

export enum StreamFormat {
  Dash = 'dash',
  Mp4 = 'mp4',
  Flv = 'flv',
}

export interface PlayUrlResult {
  id: number;
  md5?: string;
  size?: number;
  codecid?: number;
  baseUrl?: string;
  base_url?: string;
  backupUrl?: string[];
  backup_url?: string[];
}

export interface PlayUrlProvider {
  video?: PlayUrlResult[];
  audio?: PlayUrlResult[];
  codec: StreamFormat;
}

export interface PopupProvider {
  video?: PlayUrlResult[];
  audio?: PlayUrlResult[];
  codec?: StreamFormat;
  misc: {
    opusContent: boolean;
    aiSummary: boolean;
    subtitles: { id: string; name: string }[];
  };
  nfo: {
    album: boolean;
    single: boolean;
  };
  danmaku: string[];
  thumb: string[];
}

export interface MediaItem {
  title: string;
  cover: string;
  desc: string;
  duration: number;
  pubtime: number; // sec timestamp
  isTarget: boolean;
  type: MediaType;
  aid?: number;
  sid?: number;
  fid?: number;
  cid?: number;
  bvid?: string;
  epid?: number;
  ssid?: number;
  opid?: string;
  index: number;
}

export interface MediaNfo {
  showtitle?: string;
  intro?: string;
  tags: string[];
  stat: {
    play?: number;
    danmaku?: number;
    reply?: number;
    like?: number;
    coin?: number;
    favorite?: number;
    share?: number;
  };
  thumbs: {
    id: string;
    url: string;
  }[];
  premiered?: number; // sec timestamp
  upper?: {
    name: string;
    mid: number;
    avatar: string;
  };
  credits?: {
    actors: {
      role: string;
      name: string;
    }[];
    staff: {
      role: string;
      name: string;
    }[];
  };
}

export interface MediaEdge {
  graph_version: number;
  edge_id: number;
  list: EdgeStory[];
  choices?: EdgeChoice[];
  vars: EdgeVar[];
}

export interface MediaInfo {
  type: MediaType;
  id: string;
  pn?: boolean;
  nfo: MediaNfo;
  edge?: MediaEdge;
  offset?: string;
  sections?: {
    target: number;
    tabs: {
      id: number;
      name: string;
    }[];
  };
  list: MediaItem[];
}

export interface Task {
  id: string;
  state: TaskState;
  subtasks: SubTask[];
  status: Record<string, SubTaskStatus>;
  ts: number; // sec timestamp
  seq: number;
  folder: string;
  select: PopupSelect;
  item: MediaItem;
  type: MediaType;
  nfo: MediaNfo;
}

type TaskState =
  | 'pending'
  | 'active'
  | 'completed'
  | 'paused'
  | 'cancelled'
  | 'failed';

export interface SubTask {
  id: string;
  type: TaskType;
}

export interface SubTaskStatus {
  chunk: number;
  content: number;
}

export interface Scheduler {
  sid: string;
  ts: number;
  list: string[];
}
