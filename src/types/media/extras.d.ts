export interface PlayerInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
    aid: number;
    bvid: string;
    cid: number;
    ip_info: {
      ip: string;
      zone_ip: string;
      zone_id: number;
      country: string;
      province: string;
      city: string;
    };
    subtitle: {
      lan: string;
      lan_doc: string;
      subtitles: Subtitle[];
    };
    view_points: {
      type: number,
      from: number,
      to: number,
      content: number,
      imgUrl: string,
    }[];
    interaction: {
      graph_version: number;
    };
    bgm_info: {
      music_id: string;
      music_title: string;
      jump_url: string;
    };
  };
}

export interface SteinInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
    edge_id: number;
    story_list: {
      edge_id: number;
      title: string;
      cid: number;
      cover: string;
      is_current: number;
      cursor: number;
    }[];
    edges: {
      questions: {
        choices: {
          id: number;
          condition: string;
          option: string;
        }[];
      }[];
    };
    hidden_vars: {
      value: number;
      id_v2: string;
      name: string;
    }[];
  };
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

export interface Subtitle {
  id: number;
  lan: string;
  lan_doc: string;
  subtitle_url: string;
}

export interface HistoryCursorInfo {
  code: number;
  message: number;
  ttl: number;
  data: {
    cursor: {
      max: number;
      view_at: number;
      business: string;
      ps: number;
    },
    list: HistoryItem[],
    tab: HistoryTab[]
  }
}

export interface HistorySearchInfo {
  code: number;
  message: number;
  ttl: number;
  data: {
    has_more: boolean;
    page: {
      pn: number;
      total: number;
    };
    list: HistoryItem[];
  }
}

export interface HistoryTab {
  type: string;
  name: string;
}

export interface HistoryItem {
  title: string;
  long_title: string;
  cover: string;
  covers: null;
  uri: string;
  history: {
    oid: number;
    epid: number;
    bvid: string;
    page: number;
    cid: number;
    part: string;
    business: string;
    dt: number;
  };
  videos: number;
  author_name: string;
  author_face: string;
  author_mid: number;
  view_at: number;
  progress: number;
  badge: string;
  show_title: string;
  duration: number;
  total: number;
  new_desc: string;
  is_finish: number;
  is_fav: number;
  kid: number;
  tag_name: string;
  live_status: number;
}