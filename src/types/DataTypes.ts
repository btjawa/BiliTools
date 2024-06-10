export enum MediaType {
  Video = "video",
  Bangumi = "bangumi",
  Music = "music",
  Lesson = "lesson",
}

export interface MediaInfo {
  title: string;
  cover: string;
  desc: string;
  type: MediaType;
  tags: string[];
  stat: {
    play: number | null,
    danmaku: number | null,
    reply: number | string | null,
    like: number | null,
    coin: number | null,
    favorite: number | null,
    share: number | null,
    pubdate: number | string | null
  },
  upper: {
    avatar: string | null,
    name: string | null,
    mid: number | null,
  },
  list: {
    title: string;
    cover: string;
    desc: string;
    duration: number;
    id: number,
    cid: number,
    eid: number,
    ss_title: string;
  }[]
}

export interface VideoInfo {
  code: number;
  message: string;
  ttl: number;
  data: {
    View: {
      bvid: string;
      aid: number;
      videos: number;
      tid: number;
      tname: string;
      copyright: number;
      pic: string;
      title: string;
      pubdate: number;
      ctime: number;
      desc: string;
      desc_v2: {
        raw_text: string;
        type: number;
        biz_id: number;
      }[];
      state: number;
      duration: number;
      rights: {
        bp: number;
        elec: number;
        download: number;
        movie: number;
        pay: number;
        hd5: number;
        no_reprint: number;
        autoplay: number;
        ugc_pay: number;
        is_cooperation: number;
        ugc_pay_preview: number;
        no_background: number;
        clean_mode: number;
        is_stein_gate: number;
        is_360: number;
        no_share: number;
        arc_pay: number;
        free_watch: number;
      };
      owner: {
        mid: number;
        name: string;
        face: string;
      };
      stat: {
        aid: number;
        view: number;
        danmaku: number;
        reply: number;
        favorite: number;
        coin: number;
        share: number;
        now_rank: number;
        his_rank: number;
        like: number;
        dislike: number;
        evaluation: string;
        vt: number;
      };
      argue_info: {
        argue_msg: string;
        argue_type: number;
        argue_link: string;
      };
      dynamic: string;
      cid: number;
      dimension: {
        width: number;
        height: number;
        rotate: number;
      };
      premiere: null;
      teenage_mode: number;
      is_chargeable_season: boolean;
      is_story: boolean;
      is_upower_exclusive: boolean;
      is_upower_play: boolean;
      is_upower_preview: boolean;
      enable_vt: number;
      vt_display: string;
      no_cache: boolean;
      pages: {
        cid: number;
        page: number;
        from: string;
        part: string;
        duration: number;
        vid: string;
        weblink: string;
        dimension: {
          width: number;
          height: number;
          rotate: number;
        };
        first_frame: string;
      }[];
      subtitle: {
        allow_submit: boolean;
        list: unknown[];
      };
      is_season_display: boolean;
      ugc_season: {
        id: number;
        title: string;
        cover: string;
        mid: number;
        intro: string;
        sign_state: number;
        attribute: number;
        sections: {
          season_id: number;
          id: number;
          title: string;
          type: number;
          episodes: {
            season_id: number;
            section_id: number;
            id: number;
            aid: number;
            cid: number;
            title: string;
            attribute: number;
            arc: {
              aid: number;
              videos: number;
              type_id: number;
              type_name: string;
              copyright: number;
              pic: string;
              title: string;
              pubdate: number;
              ctime: number;
              desc: string;
              state: number;
              duration: number;
              rights: {
                bp: number;
                elec: number;
                download: number;
                movie: number;
                pay: number;
                hd5: number;
                no_reprint: number;
                autoplay: number;
                ugc_pay: number;
                is_cooperation: number;
                ugc_pay_preview: number;
                arc_pay: number;
                free_watch: number;
              };
              author: {
                mid: number;
                name: string;
                face: string;
              };
              stat: {
                aid: number;
                view: number;
                danmaku: number;
                reply: number;
                fav: number;
                coin: number;
                share: number;
                now_rank: number;
                his_rank: number;
                like: number;
                dislike: number;
                evaluation: string;
                argue_msg: string;
                vt: number;
                vv: number;
              };
              dynamic: string;
              dimension: {
                width: number;
                height: number;
                rotate: number;
              };
              desc_v2: null;
              is_chargeable_season: boolean;
              is_blooper: boolean;
              enable_vt: number;
              vt_display: string;
            };
            page: {
              cid: number;
              page: number;
              from: string;
              part: string;
              duration: number;
              vid: string;
              weblink: string;
              dimension: {
                width: number;
                height: number;
                rotate: number;
              };
            };
            bvid: string;
          }[];
        }[];
        stat: {
          season_id: number;
          view: number;
          danmaku: number;
          reply: number;
          fav: number;
          coin: number;
          share: number;
          now_rank: number;
          his_rank: number;
          like: number;
          vt: number;
          vv: number;
        };
        ep_count: number;
        season_type: number;
        is_pay_season: boolean;
        enable_vt: number;
      };
      user_garb: {
        url_image_ani_cut: string;
      };
      honor_reply: {
      };
      like_icon: string;
      need_jump_bv: boolean;
      disable_show_up_info: boolean;
      is_story_play: number;
    };
    Card: {
      card: {
        mid: string;
        name: string;
        approve: boolean;
        sex: string;
        rank: string;
        face: string;
        face_nft: number;
        face_nft_type: number;
        DisplayRank: string;
        regtime: number;
        spacesta: number;
        birthday: string;
        place: string;
        description: string;
        article: number;
        attentions: unknown[];
        fans: number;
        friend: number;
        attention: number;
        sign: string;
        level_info: {
          current_level: number;
          current_min: number;
          current_exp: number;
          next_exp: number;
        };
        pendant: {
          pid: number;
          name: string;
          image: string;
          expire: number;
          image_enhance: string;
          image_enhance_frame: string;
          n_pid: number;
        };
        nameplate: {
          nid: number;
          name: string;
          image: string;
          image_small: string;
          level: string;
          condition: string;
        };
        Official: {
          role: number;
          title: string;
          desc: string;
          type: number;
        };
        official_verify: {
          type: number;
          desc: string;
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
            icon_resource: {
            };
          };
          vipType: number;
          vipStatus: number;
        };
        is_senior_member: number;
      };
      space: {
        s_img: string;
        l_img: string;
      };
      following: boolean;
      archive_count: number;
      article_count: number;
      follower: number;
      like_num: number;
    };
    Tags: {
      tag_id: number;
      tag_name: string;
      music_id: string;
      tag_type: string;
      jump_url: string;
    }[];
    Reply: {
      page: null;
      replies: {
        rpid: number;
        oid: number;
        type: number;
        mid: number;
        root: number;
        parent: number;
        dialog: number;
        count: number;
        rcount: number;
        state: number;
        fansgrade: number;
        attr: number;
        ctime: number;
        like: number;
        action: number;
        content: null;
        replies: null;
        assist: number;
        show_follow: boolean;
      }[];
    };
    Related: {
      aid: number;
      videos: number;
      tid: number;
      tname: string;
      copyright: number;
      pic: string;
      title: string;
      pubdate: number;
      ctime: number;
      desc: string;
      state: number;
      duration: number;
      rights: {
        bp: number;
        elec: number;
        download: number;
        movie: number;
        pay: number;
        hd5: number;
        no_reprint: number;
        autoplay: number;
        ugc_pay: number;
        is_cooperation: number;
        ugc_pay_preview: number;
        no_background: number;
        arc_pay: number;
        pay_free_watch: number;
      };
      owner: {
        mid: number;
        name: string;
        face: string;
      };
      stat: {
        aid: number;
        view: number;
        danmaku: number;
        reply: number;
        favorite: number;
        coin: number;
        share: number;
        now_rank: number;
        his_rank: number;
        like: number;
        dislike: number;
        vt: number;
        vv: number;
      };
      dynamic: string;
      cid: number;
      dimension: {
        width: number;
        height: number;
        rotate: number;
      };
      season_id: number;
      short_link_v2: string;
      first_frame: string;
      pub_location: string;
      cover43: string;
      bvid: string;
      season_type: number;
      is_ogv: boolean;
      ogv_info: null;
      rcmd_reason: string;
      enable_vt: number;
      ai_rcmd: {
        id: number;
        goto: string;
        trackid: string;
        uniq_id: string;
      };
    }[];
    Spec: null;
    hot_share: {
      show: boolean;
      list: unknown[];
    };
    elec: null;
    recommend: null;
    emergency: {
      no_like: boolean;
      no_coin: boolean;
      no_fav: boolean;
      no_share: boolean;
    };
    view_addit: {
      63: boolean;
      64: boolean;
      69: boolean;
      71: boolean;
      72: boolean;
    };
    guide: null;
    query_tags: null;
    is_old_user: boolean;
    participle: string[];
  };
}

export interface BangumiInfo {
  code: number;
  message: string;
  result: {
    activity: {
      head_bg_url: string;
      id: number;
      title: string;
    };
    actors: string;
    alias: string;
    areas: {
      id: number;
      name: string;
    }[];
    bkg_cover: string;
    cover: string;
    delivery_fragment_video: boolean;
    enable_vt: boolean;
    episodes: {
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
      dimension: {
        height: number;
        rotate: number;
        width: number;
      };
      duration: number;
      enable_vt: boolean;
      ep_id: number;
      from: string;
      id: number;
      is_view_hide: boolean;
      link: string;
      long_title: string;
      pub_time: number;
      pv: number;
      release_date: string;
      rights: {
        allow_demand: number;
        allow_dm: number;
        allow_download: number;
        area_limit: number;
      };
      share_copy: string;
      share_url: string;
      short_link: string;
      showDrmLoginDialog: boolean;
      skip: {
        ed: {
          end: number;
          start: number;
        };
        op: {
          end: number;
          start: number;
        };
      };
      status: number;
      subtitle: string;
      title: string;
      vid: string;
    }[];
    evaluate: string;
    freya: {
      bubble_desc: string;
      bubble_show_cnt: number;
      icon_show: number;
    };
    hide_ep_vv_vt_dm: number;
    icon_font: {
      name: string;
      text: string;
    };
    jp_title: string;
    link: string;
    media_id: number;
    mode: number;
    new_ep: {
      desc: string;
      id: number;
      is_new: number;
      title: string;
    };
    payment: {
      discount: number;
      pay_type: {
        allow_discount: number;
        allow_pack: number;
        allow_ticket: number;
        allow_time_limit: number;
        allow_vip_discount: number;
        forbid_bb: number;
      };
      price: string;
      promotion: string;
      tip: string;
      view_start_time: number;
      vip_discount: number;
      vip_first_promotion: string;
      vip_price: string;
      vip_promotion: string;
    };
    play_strategy: {
      strategies: string[];
    };
    positive: {
      id: number;
      title: string;
    };
    publish: {
      is_finish: number;
      is_started: number;
      pub_time: string;
      pub_time_show: string;
      unknow_pub_date: number;
      weekday: number;
    };
    rating: {
      count: number;
      score: number;
    };
    record: string;
    rights: {
      allow_bp: number;
      allow_bp_rank: number;
      allow_download: number;
      allow_review: number;
      area_limit: number;
      ban_area_show: number;
      can_watch: number;
      copyright: string;
      forbid_pre: number;
      freya_white: number;
      is_cover_show: number;
      is_preview: number;
      only_vip_download: number;
      resource: string;
      watch_platform: number;
    };
    season_id: number;
    season_title: string;
    seasons: {
      badge: string;
      badge_info: {
        bg_color: string;
        bg_color_night: string;
        text: string;
      };
      badge_type: number;
      cover: string;
      enable_vt: boolean;
      horizontal_cover_1610: string;
      horizontal_cover_169: string;
      icon_font: {
        name: string;
        text: string;
      };
      media_id: number;
      new_ep: {
        cover: string;
        id: number;
        index_show: string;
      };
      season_id: number;
      season_title: string;
      season_type: number;
      stat: {
        favorites: number;
        series_follow: number;
        views: number;
        vt: number;
      };
    }[];
    section: {
      attr: number;
      episode_id: number;
      episode_ids: unknown[];
      episodes: {
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
        dimension: {
          height: number;
          rotate: number;
          width: number;
        };
        duration: number;
        enable_vt: boolean;
        ep_id: number;
        from: string;
        icon_font: {
          name: string;
          text: string;
        };
        id: number;
        is_view_hide: boolean;
        link: string;
        long_title: string;
        pub_time: number;
        pv: number;
        release_date: string;
        rights: {
          allow_demand: number;
          allow_dm: number;
          allow_download: number;
          area_limit: number;
        };
        share_copy: string;
        share_url: string;
        short_link: string;
        showDrmLoginDialog: boolean;
        skip: {
          ed: {
            end: number;
            start: number;
          };
          op: {
            end: number;
            start: number;
          };
        };
        stat: {
          coin: number;
          danmakus: number;
          likes: number;
          play: number;
          reply: number;
          vt: number;
        };
        stat_for_unity: {
          coin: number;
          danmaku: {
            icon: string;
            pure_text: string;
            text: string;
            value: number;
          };
          likes: number;
          reply: number;
          vt: {
            icon: string;
            pure_text: string;
            text: string;
            value: number;
          };
        };
        status: number;
        subtitle: string;
        title: string;
        vid: string;
      }[];
      id: number;
      title: string;
      type: number;
      type2: number;
    }[];
    series: {
      display_type: number;
      series_id: number;
      series_title: string;
    };
    share_copy: string;
    share_sub_title: string;
    share_url: string;
    show: {
      wide_screen: number;
    };
    show_season_type: number;
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
      vt: number;
    };
    status: number;
    styles: string[];
    subtitle: string;
    title: string;
    total: number;
    type: number;
    up_info: {
      avatar: string;
      avatar_subscript_url: string;
      follower: number;
      is_follow: number;
      mid: number;
      nickname_color: string;
      pendant: {
        image: string;
        name: string;
        pid: number;
      };
      theme_type: number;
      uname: string;
      verify_type: number;
      vip_label: {
        bg_color: string;
        bg_style: number;
        border_color: string;
        text: string;
        text_color: string;
      };
      vip_status: number;
      vip_type: number;
    };
    user_status: {
      area_limit: number;
      ban_area_show: number;
      follow: number;
      follow_status: number;
      login: number;
      pay: number;
      pay_pack_paid: number;
      progress: {
        last_ep_id: number;
        last_ep_index: string;
        last_time: number;
      };
      sponsor: number;
      vip_info: {
        due_date: number;
        status: number;
        type: number;
      };
    };
  };
}

export interface MusicInfo {
  code: number;
  msg: string;
  data: {
    id: number;
    uid: number;
    uname: string;
    author: string;
    title: string;
    cover: string;
    intro: string;
    lyric: string;
    crtype: number;
    duration: number;
    passtime: number;
    curtime: number;
    aid: number;
    bvid: string;
    cid: number;
    msid: number;
    attr: number;
    limit: number;
    activityId: number;
    limitdesc: string;
    ctime: null;
    statistic: {
      sid: number;
      play: number;
      collect: number;
      comment: number;
      share: number;
    };
    vipInfo: {
      type: number;
      status: number;
      due_date: number;
      vip_pay_type: number;
    };
    collectIds: unknown[];
    coin_num: number;
  };
}

export interface LessonInfo {
  code: number;
  data: {
    abtest_info: {
      style_abtest: number;
    };
    active_market: number[];
    activity_list: unknown[];
    be_subscription: boolean;
    brief: {
      content: string;
      img: {
        aspect_ratio: number;
        url: string;
      }[];
      title: string;
      type: number;
    };
    catalogue_top: {
      btn_text: string;
      guide_text: string;
      img_url: string;
      sub_guide_text: string;
      type: number;
    };
    coach: {
      detail_url: string;
      directory_url: string;
      h5_url: string;
    };
    consulting: {
      consulting_flag: boolean;
      consulting_url: string;
    };
    cooperation: {
      link: string;
    };
    cooperators: unknown[];
    coupon: {
      amount: number;
      coupon_type: number;
      discount_amount: string;
      expire_minute: string;
      expire_time: string;
      receive_expire_time: number;
      scene_background_img: string;
      scene_benefit_img: string;
      scene_countdown: boolean;
      scene_mark: string;
      short_title: string;
      show_amount: string;
      start_time: string;
      status: number;
      title: string;
      token: string;
      use_expire_time: number;
      use_scope: string;
    };
    course_content: string;
    courses: unknown[];
    cover: string;
    ep_catalogue: unknown[];
    ep_count: number;
    episode_page: {
      next: boolean;
      num: number;
      size: number;
      total: number;
    };
    episode_sort: number;
    episode_tag: {
      part_preview_tag: string;
      pay_tag: string;
      preview_tag: string;
    };
    episodes: {
      aid: number;
      catalogue_index: number;
      cid: number;
      cover: string;
      duration: number;
      ep_status: number;
      episode_can_view: boolean;
      from: string;
      id: number;
      index: number;
      label: string;
      page: number;
      play: number;
      play_way: number;
      playable: boolean;
      release_date: number;
      show_vt: boolean;
      status: number;
      subtitle: string;
      title: string;
      watched: boolean;
      watchedHistory: number;
    }[];
    expiry_day: number;
    expiry_info_content: string;
    faq: {
      content: string;
      link: string;
      title: string;
    };
    faq1: {
      items: {
        answer: string;
        question: string;
      }[];
      title: string;
    };
    is_enable_cash: boolean;
    is_series: boolean;
    live_ep_count: number;
    opened_ep_count: number;
    pack_info: {
      pack_item_list: {
        brief: {
          content: string;
          img: unknown[];
          type: number;
        };
        btn_notice: string;
        btn_original_price_notice: string;
        coupon_batch_token: string;
        is_enable_cash: boolean;
        name: string;
        original_price: string;
        original_price_prefix: string;
        original_price_unit: string;
        product_available: boolean;
        product_cover: string;
        product_id: number;
        product_notice: string;
        product_paid: boolean;
        product_status: number;
        product_type: number;
        relative_item_count_notice: string;
        relative_item_list: {
          cover: string;
          ep_count_notice: string;
          expiry_notice: string;
          original_price: string;
          original_price_notice: string;
          original_price_prefix: string;
          original_price_unit: string;
          season_id: number;
          season_paid: boolean;
          title: string;
        }[];
        season_ep_count_notice: string;
        show_amount: string;
        show_amount_notice: string;
        text_describe: string;
        visible_detail: boolean;
      }[];
      pack_notice2: string;
      show_packs_right: boolean;
      title: string;
    };
    paid_jump: {
      jump_url_for_app: string;
      url: string;
    };
    paid_view: boolean;
    payment: {
      bp_enough: number;
      desc: string;
      discount_desc: string;
      discount_prefix: string;
      my_bp: number;
      pay_shade: string;
      price: number;
      price_format: string;
      price_unit: string;
      refresh_text: string;
      select_text: string;
    };
    previewed_purchase_note: {
      long_watch_text: string;
      pay_text: string;
      price_format: string;
      watch_text: string;
      watching_text: string;
    };
    purchase_format_note: {
      content_list: {
        bold: boolean;
        content: string;
        number: string;
      }[];
      link: string;
      title: string;
    };
    purchase_note: {
      content: string;
      link: string;
      title: string;
    };
    purchase_protocol: {
      link: string;
      title: string;
    };
    recommend_seasons: {
      cover: string;
      ep_count: string;
      id: number;
      season_url: string;
      subtitle: string;
      title: string;
      view: number;
    }[];
    release_bottom_info: string;
    release_info: string;
    release_info2: string;
    release_status: string;
    season_id: number;
    season_tag: number;
    share_url: string;
    short_link: string;
    show_watermark: boolean;
    stat: {
      play: number;
      play_desc: string;
      show_vt: boolean;
    };
    status: number;
    stop_sell: boolean;
    subscription_update_count_cycle_text: string;
    subtitle: string;
    title: string;
    up_info: {
      avatar: string;
      brief: string;
      follower: number;
      is_follow: number;
      is_living: boolean;
      link: string;
      mid: number;
      pendant: {
        image: string;
        name: string;
        pid: number;
      };
      season_count: number;
      uname: string;
    };
    update_status: number;
    user_status: {
      bp: number;
      expire_at: number;
      favored: number;
      favored_count: number;
      is_expired: boolean;
      is_first_paid: boolean;
      payed: number;
      progress: {
        last_ep_id: number;
        last_ep_index: string;
        last_time: number;
      };
      user_expiry_content: string;
    };
    watermark_interval: number;
  };
  message: string;
}

export interface MusicTagsInfo {
  code: number;
  msg: string;
  data: {
    type: string;
    subtype: number;
    key: number;
    info: string;
  }[];
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
    dash: {
      duration: number;
      minBufferTime: number;
      min_buffer_time: number;
      video: {
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
      }[];
      audio: {
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
      }[];
      dolby: {
        type: number;
        audio: null;
      };
      flac: null;
    };
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
      quality: number;
      new_description: string;
    }[];
    message: string;
    accept_quality: number[];
    quality: number;
    timelength: number;
    durls: unknown[];
    has_paid: boolean;
    dash: {
      duration: number;
      minBufferTime: number;
      min_buffer_time: number;
      video: {
        start_with_sap: number;
        bandwidth: number;
        sar: string;
        backupUrl: string[];
        codecs: string;
        base_url: string;
        backup_url: string[];
        segment_base: {
          initialization: string;
          index_range: string;
        };
        mimeType: string;
        frame_rate: string;
        SegmentBase: {
          Initialization: string;
          indexRange: string;
        };
        frameRate: string;
        codecid: number;
        baseUrl: string;
        size: number;
        mime_type: string;
        width: number;
        startWithSAP: number;
        id: number;
        height: number;
        md5: string;
      }[];
      audio: {
        start_with_sap: number;
        bandwidth: number;
        sar: string;
        backupUrl: string[];
        codecs: string;
        base_url: string;
        backup_url: string[];
        segment_base: {
          initialization: string;
          index_range: string;
        };
        mimeType: string;
        frame_rate: string;
        SegmentBase: {
          Initialization: string;
          indexRange: string;
        };
        frameRate: string;
        codecid: number;
        baseUrl: string;
        size: number;
        mime_type: string;
        width: number;
        startWithSAP: number;
        id: number;
        height: number;
        md5: string;
      }[];
      dolby: {
        audio: unknown[];
        type: number;
      };
    };
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
}

export interface LessonPlayUrlInfo {
  code: number;
  data: {
    accept_format: string;
    code: number;
    seek_param: string;
    is_preview: number;
    no_rexcode: number;
    format: string;
    fnval: number;
    video_project: boolean;
    fnver: number;
    support_formats: {
      display_desc: string;
      superscript: string;
      need_login: boolean;
      codecs: string[];
      format: string;
      description: string;
      quality: number;
      new_description: string;
    }[];
    message: string;
    type: string;
    accept_quality: number[];
    quality: number;
    timelength: number;
    result: string;
    seek_type: string;
    has_paid: boolean;
    from: string;
    dash: {
      duration: number;
      min_buffer_time: number;
      video: {
        start_with_sap: number;
        bandwidth: number;
        sar: string;
        codecs: string;
        base_url: string;
        backup_url: string[];
        segment_base: {
          initialization: string;
          index_range: string;
        };
        frame_rate: string;
        codecid: number;
        size: number;
        mime_type: string;
        width: number;
        id: number;
        noRexcode: number;
        height: number;
        md5: string;
      }[];
      audio: {
        start_with_sap: number;
        bandwidth: number;
        sar: string;
        codecs: string;
        base_url: string;
        backup_url: string[];
        segment_base: {
          initialization: string;
          index_range: string;
        };
        frame_rate: string;
        codecid: number;
        size: number;
        mime_type: string;
        width: number;
        id: number;
        noRexcode: number;
        height: number;
        md5: string;
      }[];
      losslessAudio: {
        isLosslessAudio: boolean;
      };
      dolby: {
        audio: unknown[];
        type: string;
      };
    };
    video_codecid: number;
    accept_description: string[];
    status: number;
  };
  message: string;
}