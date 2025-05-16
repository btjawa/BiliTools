export const QualityMap = {
  dms: [
    { id: 6 }, { id: 16 }, { id: 32 }, { id: 64 },
    { id: 80 }, { id: 112 }, { id: 116 }, { id: 120 },
    { id: 125 }, { id: 126 }, { id: 127 },
  ],
  ads: [
    { id: 30216 }, { id: 30228 }, { id: 30232 }, { id: 30280 },
    { id: 30250 }, { id: 30380 }, { id: 30251 }, { id: 30252 },
  ],
  cdc: [{ id: 7 }, { id: 12 }, { id: 13 }],
  fmt: [{ id: 0 }, { id: 1 }, { id: 2 }]
}

export interface CurrentSelect {
  dms: number;
  ads: number;
  cdc: number;
  fmt: number
};

export const FilenamePlaceholders = [
  'index',
  'title',
  'upper',
  'upperid',
  'aid',
  'sid',
  'fid',
  'bvid',
  'cid',
  'epid',
  'ssid',
  'date_sec',
  'ts_sec',
  'ts_ms',
  'dms',
  'cdc',
  'ads',
  'fmt',
] as const;

export const FolderPlaceholders = [
  'title',
  'upper',
  'upperid',
  'date_sec',
  'ts_sec',
  'ts_ms',
  'dms',
  'cdc',
  'ads',
  'fmt',
] as const;

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

export enum StreamCodecType {
  Dash = "dash",
  Mp4 = "mp4",
  Flv = "flv",
}

export const StreamCodecMap: Record<number, StreamCodecType> = {
  0: StreamCodecType.Dash,
  1: StreamCodecType.Mp4,
  2: StreamCodecType.Flv
};

export const ReverseStreamCodecMap: Record<StreamCodecType, number> = {
  [StreamCodecType.Dash]: 0,
  [StreamCodecType.Mp4]: 1,
  [StreamCodecType.Flv]: 2
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

interface PackageSelect {
  video?: any;
  audio?: any;
  audioVideo?: any;
  covers?: any;
  aiSummary?: any;
  liveDanmaku?: any;
  subtitles?: string;
}

export interface PlayUrlProvider {
  video?: PlayUrlResult[];
  videoQualities?: number[];
  audio?: PlayUrlResult[];
  audioQualities?: number[];
  codec: StreamCodecType;
  codecid: number;
}

export interface OthersProvider {
  aiSummary: boolean;
  danmaku: boolean;
  covers: { id: string; url: string }[],
  subtitles: Subtitle[],
}

export interface MediaInfo {
  type: MediaType;
  id: number;
  title: string;
  cover: string;
  covers: OthersProvider['covers'];
  desc: string;
  tags: string[];
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
  upper: {
    avatar?: string,
    name?: string,
    mid?: number,
  },
  list: {
    title: string;
    cover: string;
    desc: string;
    duration: number;
    pubtime: number; // sec timestamp
    aid?: number; // general video
    sid?: number; // music
    fid?: number; // favorite
    cid?: number;
    bvid?: string;
    epid?: number;
    ssid?: number;
    index: number
  }[]
}

export interface VideoTags {
  code: number;
  message: string;
  ttl: number;
  data: {
    tag_id: number;
    tag_name: string;
  }[];
}

export interface VideoInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
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
    pages: {
      cid: number;
      page: number;
      part: string;
      duration: number;
      ctime: number;
    }[];
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
        episodes: {
          season_id: number;
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
          bvid: string;
        }[];
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
  show_title: string;
  pub_time: number;
  share_copy: string;
  short_link: string;
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
    section: {
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
    up_info: {
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
        url: string
      }[]
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
  }[]
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
  }
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
};


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

export interface VideoPlayUrlInfo  {
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
};

export interface PlayUrlDash {
  duration: number;
  min_buffer_time: number;
  video: PlayUrlDashData[];
  audio: PlayUrlDashData[];
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
  }[],
  quality: number;
}

export interface AISummaryInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
    code: number;
    model_result: {
      result_type: number;
      summary: string;
      outline: {
        title: string;
        part_outline: {
          timestamp: number;
          content: string;
        }[];
        timestamp: number;
      }[];
      subtitle: {
        title: string;
        part_subtitle: {
          start_timestamp: number;
          end_timestamp: number;
          content: string;
        }[];
        timestamp: number;
      }[];
    };
    stid: string;
    status: number;
    like_num: number;
    dislike_num: number;
  };
}

export interface Subtitle {
  id: number;
  lan: string;
  lan_doc: string;
  subtitle_url: string;
}

export interface SubtitleInfo {
  font_size: number;
  font_color: string;
  background_alpha: number;
  background_color: string;
  Stroke: string;
  body: {
    from: number;
    to: number;
    location: number;
    content: string;
  }[];
}

export interface PlayerInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
    aid: number;
    bvid: string;
    allow_bp: boolean;
    no_share: boolean;
    cid: number;
    max_limit: number;
    page_no: number;
    has_next: boolean;
    ip_info: {
      ip: string;
      zone_ip: string;
      zone_id: number;
      country: string;
      province: string;
      city: string;
    };
    login_mid: number;
    login_mid_hash: string;
    is_owner: boolean;
    name: string;
    permission: string;
    level_info: {
      current_level: number;
      current_min: number;
      current_exp: number;
      next_exp: number;
      level_up: number;
    };
    vip: {
      type: number;
      status: number;
      due_date: number;
      vip_pay_type: number;
      theme_type: number;
      label: {
        path: string;
        text: string;
        label_theme: string;
        text_color: string;
        bg_style: number;
        bg_color: string;
        border_color: string;
        use_img_label: boolean;
        img_label_uri_hans: string;
        img_label_uri_hant: string;
        img_label_uri_hans_static: string;
        img_label_uri_hant_static: string;
      };
      avatar_subscript: number;
      nickname_color: string;
      role: number;
      avatar_subscript_url: string;
      tv_vip_status: number;
      tv_vip_pay_type: number;
      tv_due_date: number;
      avatar_icon: {
        icon_type: number;
        icon_resource: {
        };
      };
    };
    answer_status: number;
    block_time: number;
    role: string;
    last_play_time: number;
    last_play_cid: number;
    now_time: number;
    online_count: number;
    need_login_subtitle: boolean;
    subtitle: {
      allow_submit: boolean;
      lan: string;
      lan_doc: string;
      subtitles: {
        id: number;
        lan: string;
        lan_doc: string;
        is_lock: boolean;
        subtitle_url: string;
        subtitle_url_v2: string;
        type: number;
        id_str: string;
        ai_type: number;
        ai_status: number;
      }[];
    };
    view_points: {
      type: number,
      from: number,
      to: number,
      content: number,
      imgUrl: string,
    }[];
    preview_toast: string;
    interaction: {
      history_node: {
        node_id: number;
        title: string;
        cid: number;
      };
      graph_version: number;
      msg: string;
      error_toast: string;
      mark: number;
      need_reload: number;
    };
    options: {
      is_360: boolean;
      without_vip: boolean;
    };
    guide_attention: unknown[];
    jump_card: unknown[];
    operation_card: unknown[];
    online_switch: {
      enable_gray_dash_playback: string;
      new_broadcast: string;
      realtime_dm: string;
      subtitle_submit_switch: string;
    };
    fawkes: {
      config_version: number;
      ff_version: number;
    };
    show_switch: {
      long_progress: boolean;
    };
    bgm_info: {
      music_id: string;
      music_title: string;
      jump_url: string;
    };
    toast_block: boolean;
    is_upower_exclusive: boolean;
    is_upower_play: boolean;
    is_ugc_pay_preview: boolean;
    elec_high_level: {
      privilege_type: number;
      title: string;
      sub_title: string;
      show_button: boolean;
      button_text: string;
      jump_url: string;
      intro: string;
      new: boolean;
    };
    disable_show_up_info: boolean;
  };
}

export interface SteinInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
    title: string;
    edge_id: number;
    story_list: {
      node_id: number;
      edge_id: number;
      title: string;
      cid: number;
      start_pos: number;
      cover: string;
      is_current: number;
      cursor: number;
    }[];
    edges: {
      dimension: {
        width: number;
        height: number;
        rotate: number;
        sar: string;
      };
      questions: {
        id: number;
        type: number;
        start_time_r: number;
        duration: number;
        pause_video: number;
        title: string;
        choices: {
          id: number;
          platform_action: string;
          native_action: string;
          condition: string;
          cid: number;
          option: string;
          is_default: number;
        }[];
      }[];
      skin: {
        choice_image: string;
        title_text_color: string;
        title_shadow_color: string;
        title_shadow_offset_y: number;
        title_shadow_radius: number;
        progressbar_color: string;
        progressbar_shadow_color: string;
      };
    };
    buvid: string;
    preload: {
      video: {
        aid: number;
        cid: number;
      }[];
    };
    hidden_vars: {
      value: number;
      id: string;
      id_v2: string;
      type: number;
      is_show: number;
      name: string;
      skip_overwrite: number;
    }[];
    is_leaf: number;
  };
}