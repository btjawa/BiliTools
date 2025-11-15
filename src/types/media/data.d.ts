import { OpusRichNode } from './opus.d';

export interface VideoTags {
  code: number;
  message: string;
  ttl: number;
  data: {
    tag_id: number;
    tag_name: string;
  }[];
}

export interface UgcInfo {
  section_id: number;
  id: number;
  aid: number;
  cid: number;
  title: string;
  arc: {
    aid: number;
    pic: string;
    title: string;
    pubdate: number;
    ctime: number;
    desc: string;
    duration: number;
  };
  page: {
    cid: number;
    page: number;
    part: string;
    duration: number;
  };
  pages: {
    cid: number;
    page: number;
    part: string;
    duration: number;
  }[];
  bvid: string;
}

export interface VideoPage {
  cid: number;
  page: number;
  part?: string;
  duration: number;
  ctime?: number;
}

export interface VideoItemInfo {
  bvid: string;
  aid: number;
  pic: string;
  title: string;
  pubdate: number;
  ctime: number;
  desc: string;
  duration: number;
  rights: {
    is_stein_gate: number;
  };
  owner: {
    mid: number;
    name: string;
    face: string;
  };
  stat: {
    view: number;
    danmaku: number;
    reply: number;
    favorite: number;
    coin: number;
    share: number;
    like: number;
  };
  cid: number;
  pages?: VideoPage[];
}

export interface VideoInfo {
  code: number;
  message: string;
  ttl: number;
  data: VideoItemInfo & {
    ugc_season: {
      id: number;
      title: string;
      cover: string;
      intro: string;
      sections: {
        season_id: number;
        id: number;
        type: number;
        title: string;
        episodes: UgcInfo[];
      }[];
    };
  };
}

interface EpisodeInfo {
  aid: number;
  badge: string;
  badge_info: {
    bg_color: string;
    bg_color_night: string;
    text: string;
  };
  badge_type: number;
  bvid: string;
  cid: number;
  cover: string;
  horizontal_cover_1610: string;
  horizontal_cover_169: string;
  duration: number;
  ep_id: number;
  id: number;
  link: string;
  long_title: string;
  season_id: number;
  season_title: string;
  title?: string;
  show_title?: string;
  pub_time: number;
  share_copy: string;
  share_url: string;
  short_link: string;
}

export interface BangumiMediaInfo {
  code: number;
  message: string;
  result: {
    media: {
      season_id: number;
    };
  };
}

export interface BangumiInfo {
  code: number;
  message: string;
  result: {
    actors: string;
    cover: string;
    episodes: EpisodeInfo[];
    evaluate: string;
    media_id: number;
    positive: {
      id: number;
      title: string;
    };
    publish: {
      is_finish: number;
      is_started: number;
      pub_time: string;
      pub_time_show: string;
    };
    rating: {
      count: number;
      score: number;
    };
    season_id: number;
    season_title: string;
    seasons: EpisodeInfo[];
    section?: {
      id: number;
      title: string;
      episodes: EpisodeInfo[];
    }[];
    share_copy: string;
    share_sub_title: string;
    share_url: string;
    square_cover: string;
    staff: string;
    stat: {
      coins: number;
      danmakus: number;
      favorite: number;
      favorites: number;
      follow_text: string;
      likes: number;
      reply: number;
      share: number;
      views: number;
    };
    styles: string[];
    subtitle: string;
    title: string;
    up_info?: {
      avatar: string;
      follower: number;
      is_follow: number;
      mid: number;
      uname: string;
    };
  };
}

export interface LessonInfo {
  code: number;
  data: {
    brief: {
      img: {
        url: string;
      }[];
    };
    cover: string;
    episode_tag: {
      part_preview_tag: string;
      pay_tag: string;
      preview_tag: string;
    };
    episodes: {
      aid: number;
      cid: number;
      cover: string;
      duration: number;
      id: number;
      index: number;
      label: string;
      page: number;
      play: number;
      playable: boolean;
      release_date: number;
      subtitle: string;
      title: string;
    }[];
    faq: {
      content: string;
      title: string;
    };
    season_id: number;
    share_url: string;
    short_link: string;
    stat: {
      play: number;
      play_desc: string;
      show_vt: boolean;
    };
    subtitle: string;
    title: string;
    up_info: {
      avatar: string;
      brief: string;
      follower: number;
      mid: number;
      season_count: number;
      uname: string;
    };
  };
  message: string;
}

export interface MusicTagsInfo {
  code: number;
  msg: string;
  data: {
    key: number;
    info: string;
  }[];
}

export interface MusicMembersInfo {
  code: number;
  msg: string;
  data: {
    type: number;
    list: {
      member_id: number;
      name: string;
    }[];
  }[];
}

export interface MusicUpperInfo {
  code: number;
  msg: string;
  data: {
    uid: number;
    uname: string;
    avater: string;
    avatar: string; // actually fallbacks
    sign: string;
  };
}

interface MusicInfoData {
  id: number;
  uid: number;
  uname: string;
  author: string;
  title: string;
  cover: string;
  intro: string;
  lyric: string;
  duration: number;
  passtime: number;
  curtime: number;
  aid: number;
  bvid: string;
  cid: number;
  statistic: {
    sid: number;
    play: number;
    collect: number;
    comment: number;
    share: number;
  };
  collectIds: unknown[];
  coin_num: number;
}

export interface MusicInfo {
  code: number;
  msg: string;
  data: MusicInfoData;
}

export interface MusicListInfo {
  code: number;
  msg: string;
  data: {
    menuId: number;
    uid: number;
    uname: string;
    title: string;
    cover: string;
    intro: string;
    ctime: number;
    curtime: number;
    statistic: {
      sid: number;
      play: number;
      collect: number;
      comment: number;
      share: number;
    };
  };
}

export interface MusicListDetailInfo {
  code: number;
  msg: string;
  data: {
    curPage: number;
    pageCount: number;
    totalSize: number;
    pageSize: number;
    data: MusicInfoData[];
  };
}

export interface WatchLaterInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
    list: VideoItemInfo[];
  };
}

export interface FavoriteListInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
    list: {
      id: number;
      fid: number;
      mid: number;
      title: string;
    }[];
  };
}

export interface FavoriteInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
    info: {
      id: number;
      fid: number;
      mid: number;
      title: string;
      cover: string;
      upper: {
        mid: number;
        name: string;
        face: string;
      };
      cnt_info: {
        collect: number;
        play: number;
        thumb_up: number;
        share: number;
      };
      intro: string;
      ctime: number;
      media_count: number;
    };
    medias: {
      id: number;
      bvid: string;
      type: number;
      title: string;
      cover: string;
      intro: string;
      duration: number;
      upper: {
        mid: number;
        name: string;
        face: string;
      };
      ctime: number;
      pubtime: number;
    }[];
    has_more: boolean;
    ttl: number;
  };
}

export interface OpusInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
    item: {
      id: string;
      type: 1;
      user: {
        mid: number;
        name: string;
      };
      common_card: {
        cover: string;
        nodes: OpusRichNode[];
      };
    };
  };
}

export interface OpusListInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
    list: {
      id: number;
      mid: number;
      name: string;
      image_url: string;
      update_time: number;
      ctime: number;
      publish_time: number;
      summary: string;
      words: number;
      read: number;
      articles_count: number;
    };
    articles: {
      id: number;
      title: string;
      publish_time: number;
      words: number;
      image_urls: string[];
      categories: {
        name: string;
      }[];
      summary: string;
      dyn_id_str: string;
      author_uid: number;
      stats: {
        view: number;
        favorite: number;
        like: number;
        reply: number;
        share: number;
        coin: number;
      };
    }[];
    author: {
      mid: number;
      name: string;
      face: string;
    };
  };
}

export interface UploadsInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
    list: {
      vlist: {
        aid: number;
        bvid: string;
        pic: string;
        mid: number;
        title: string;
        description: string;
        length: string;
        created: number;
      }[];
    };
  };
}

export interface UploadsArchive {
  aid: number;
  bvid: string;
  ctime: number;
  duration: number;
  pic: string;
  pubdate: number;
  stat: {
    view: number;
  };
  title: string;
}

export interface UploadsMeta {
  cover: string;
  description: string;
  mid: number;
  name: string;
  ptime: number;
  season_id: number;
  series_id: number;
}

export interface UploadsSeriesInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
    items_lists: {
      seasons_list: {
        archives: UploadsArchive[];
        meta: UploadsMeta;
      }[];
      series_list: {
        archives: UploadsArchive[];
        meta: UploadsMeta;
      }[];
    };
  };
}

export interface UploadsArchivesInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
    archives: UploadsArchive[];
  };
}

export interface UserOpusInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
    items: {
      content: string;
      cover?: {
        url: string;
      };
      opus_id: string;
    }[];
    offset: string;
  };
}

export interface UserAudioInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
    data: MusicInfoData[];
  };
}

export interface VideoPlayUrlInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
    from: string;
    result: string;
    message: string;
    quality: number;
    format: string;
    timelength: number;
    accept_format: string;
    accept_description: string[];
    accept_quality: number[];
    video_codecid: number;
    seek_param: string;
    seek_type: string;
    durls?: PlayUrlDurl[];
    dash?: PlayUrlDash;
    durl?: PlayUrlDurl['durl'];
    support_formats: {
      quality: number;
      format: string;
      new_description: string;
      display_desc: string;
      superscript: string;
      codecs: string[];
    }[];
    high_format: null;
    last_play_time: number;
    last_play_cid: number;
    view_info: null;
  };
}

export interface BangumiPlayUrlInfo {
  code: number;
  message: string;
  result: {
    video_info: {
      accept_format: string;
      code: number;
      seek_param: string;
      is_preview: number;
      fnval: number;
      video_project: boolean;
      fnver: number;
      type: string;
      bp: number;
      result: string;
      seek_type: string;
      vip_type: number;
      from: string;
      video_codecid: number;
      record_info: {
        record_icon: string;
        record: string;
      };
      is_drm: boolean;
      no_rexcode: number;
      format: string;
      support_formats: {
        display_desc: string;
        has_preview: boolean;
        sub_description: string;
        superscript: string;
        need_login: boolean;
        codecs: string[];
        format: string;
        description: string;
        need_vip: boolean;
        attribute: number;
        quality: number;
        new_description: string;
      }[];
      message: string;
      accept_quality: number[];
      quality: number;
      timelength: number;
      durls?: PlayUrlDurl[];
      durl?: PlayUrlDurl['durl'];
      dash?: PlayUrlDash;
      has_paid: boolean;
      vip_status: number;
      clip_info_list: {
        materialNo: number;
        start: number;
        end: number;
        toastText: string;
        clipType: string;
      }[];
      accept_description: string[];
      status: number;
    };
  };
}

export interface MusicPlayUrlInfo {
  code: number;
  msg: string;
  data: {
    sid: number;
    type: number;
    info: string;
    timeout: number;
    size: number;
    cdns: string[];
    qualities: {
      type: number;
      desc: string;
      size: number;
      bps: string;
      tag: string;
      require: number;
      requiredesc: string;
    }[];
    title: string;
    cover: string;
  };
}

interface PlayUrlDashData {
  id: number;
  baseUrl: string;
  base_url: string;
  backupUrl: string[];
  backup_url: string[];
  bandwidth: number;
  mimeType: string;
  mime_type: string;
  codecs: string;
  width: number;
  height: number;
  frameRate: string;
  frame_rate: string;
  sar: string;
  startWithSap: number;
  start_with_sap: number;
  SegmentBase: {
    Initialization: string;
    indexRange: string;
  };
  segment_base: {
    initialization: string;
    index_range: string;
  };
  codecid: number;
}

export interface PlayUrlDash {
  duration: number;
  min_buffer_time: number;
  video?: PlayUrlDashData[];
  audio?: PlayUrlDashData[];
  losslessAudio: {
    isLosslessAudio: boolean;
  };
  dolby: {
    type: number;
    audio?: PlayUrlDashData[];
  };
  flac?: {
    display: boolean;
    audio: PlayUrlDashData;
  };
}

export interface PlayUrlDurl {
  durl: {
    size: number;
    length: number;
    ahead: string;
    vhead: string;
    backup_url: string[];
    url: string;
    order: number;
    md5: string;
  }[];
  quality: number;
}
