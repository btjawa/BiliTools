import { SteinInfo } from "./media/extras.d";

export const QualityMap = {
  res: [6, 16, 32, 64, 80, 112, 116, 120, 125, 126, 127],
  abr: [30216, 30228, 30232, 30280, 30250, 30380, 30251, 30252],
  enc: [7, 12, 13],
  fmt: [StreamFormat.Dash, StreamFormat.Mp4, StreamFormat.Flv],
}

export interface PopupSelect {
  res: number;
  abr: number;
  enc: number;
  fmt: StreamFormat;
  misc: {
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
  }
};

export interface Headers {
  'Cookie': string;
  'User-Agent': string;
  'Referer': string;
  'Origin': string;
  [key: string]: string;
}

export enum Queue {
  Waiting = "waiting",
  Doing = "doing",
  Complete = "complete",
}

export enum MediaType {
  Video = "video",
  Bangumi = "bangumi",
  Music = "music",
  MusicList = "musicList",
  Lesson = "lesson",
  Favorite = "favorite",
}

export enum StreamFormat {
  Dash = "dash",
  Mp4 = "mp4",
  Flv = "flv",
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
  ts: number; // ms timestamp
}

export interface ExtrasProvider {
  misc: {
    aiSummary: boolean;
    subtitles: { id: string; name: string; }[];
  };
  nfo: boolean;
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
  type: MediaType; // specific type
  aid?: number; // general video
  sid?: number; // music
  fid?: number; // favorite
  cid?: number;
  bvid?: string;
  epid?: number;
  ssid?: number;
  index: number
}

export interface MediaNfo {
  tags: string[];
  thumbs: { id: string; url: string }[];
  showtitle: string;
  premiered: string; // YYYY-MM-DD, pubtime
  upper: {
    name: string;
    mid: number;
    avatar: string;
  } | null;
  actors: {
    role: string;
    name: string;
  }[];
  staff: string[];
}

export interface MediaInfo {
  type: MediaType;
  id: number;
  desc: string;
  nfo: MediaNfo,
  stein_gate?: {
    grapth_version: number;
    edge_id: number;
    story_list: SteinInfo["data"]["story_list"];
    choices?: SteinInfo["data"]["edges"]["questions"][0]["choices"];
    hidden_vars: SteinInfo["data"]["hidden_vars"];
  };
  stat: {
    play?: number,
    danmaku?: number,
    reply?: number | string,
    like?: number,
    coin?: number,
    favorite?: number,
    share?: number,
  },
  list: MediaItem[]
}