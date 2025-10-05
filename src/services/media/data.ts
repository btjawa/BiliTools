import {
  tryFetch,
  getPublicImages,
  mapBangumiStaffs,
  mapMusicStaffs,
} from '../utils';
import { getPlayerInfo, getEdgeInfo, getUserInfo } from './extras';
import { getOpusDetails } from './opus';
import { useUserStore } from '@/store';
import { AppError } from '../error';
import * as Resps from '@/types/media/data.d';
import * as Types from '@/types/shared.d';

export async function getMediaInfo(
  id: string,
  type: Types.MediaType,
  options?: { pn?: number; offset?: string; target?: number },
): Promise<Types.MediaInfo> {
  let url = 'https://api.bilibili.com';
  let params = {};
  const idType = id.slice(0, 2).toLowerCase();
  const idNum = id.match(/\d+/)?.[0].toString();
  switch (type) {
    case Types.MediaType.Video:
      url += '/x/web-interface/view';
      params = idType === 'bv' ? { bvid: id } : { aid: idNum };
      break;
    case Types.MediaType.Bangumi:
      url += '/pgc/view/web/season';
      if (idType === 'md') {
        const body = (await tryFetch(
          'https://api.bilibili.com/pgc/review/user',
          { params: { media_id: idNum } },
        )) as Resps.BangumiMediaInfo;
        params = { season_id: body.result.media.season_id };
      } else {
        params = idType === 'ss' ? { season_id: idNum } : { ep_id: idNum };
      }
      break;
    case Types.MediaType.Lesson:
      url += '/pugv/view/web/season';
      params = idType === 'ss' ? { season_id: idNum } : { ep_id: idNum };
      break;
    case Types.MediaType.Music:
      url = 'https://www.bilibili.com/audio/music-service-c/web/song/info';
      params = { sid: idNum };
      break;
    case Types.MediaType.MusicList:
      url = 'https://www.bilibili.com/audio/music-service-c/web/menu/info';
      params = { sid: idNum };
      break;
    case Types.MediaType.WatchLater:
      url += '/x/v2/history/toview/web';
      params = { ps: 20, pn: options?.pn ?? 1 };
      break;
    case Types.MediaType.Favorite:
      url += '/x/v3/fav/folder/created/list-all';
      params = { up_mid: idNum };
      break;
    case Types.MediaType.Opus:
      url += '/x/polymer/web-dynamic/v1/forward/preview';
      if (idType === 'cv') {
        const url = await tryFetch(`https://www.bilibili.com/read/${id}`, {
          type: 'url',
        });
        params = {
          id: (url as string).match(/\/opus\/(\d+)/)?.[1],
        };
      } else {
        params = { id };
      }
      break;
    case Types.MediaType.UserVideo:
      url += '/x/polymer/web-space/home/seasons_series';
      params = { mid: idNum, page_size: 10, page_num: options?.pn ?? 1 };
      break;
    case Types.MediaType.UserOpus:
      url += '/x/polymer/web-dynamic/v1/opus/feed/space';
      params = {
        host_mid: idNum,
        page: 1,
        offset: options?.offset ?? '',
        type: 'all',
      };
      break;
    case Types.MediaType.UserAudio:
      url += '/audio/music-service/web/song/upper';
      params = { uid: idNum, ps: 42, pn: options?.pn ?? 1 };
      break;
  }
  const body = await tryFetch(url, { params });
  if (type === Types.MediaType.Video) {
    const link = 'https://www.bilibili.com/video/';
    const data = (body as Resps.VideoInfo).data;
    const map = (ep: Resps.UgcInfo, index: number) => ({
      title: ep.title,
      cover: ep.arc.pic,
      desc: ep.arc.desc,
      url: link + ep.bvid,
      aid: ep.aid,
      bvid: ep.bvid,
      cid: ep.cid,
      duration: ep.page.duration,
      pubtime: ep.arc.pubdate,
      type: Types.MediaType.Video,
      isTarget: ep.aid === data.aid,
      index,
    });
    const pageMap = (page: Resps.VideoPage, index: number) => ({
      title: page.part || data.title,
      cover: data.pic,
      desc: data.desc,
      url: link + data.bvid,
      aid: data.aid,
      bvid: data.bvid,
      cid: page.cid,
      duration: page.duration,
      pubtime: page.ctime ?? data.pubdate,
      type: Types.MediaType.Video,
      isTarget: index === 0,
      index,
    });
    let sections = undefined;
    let edge = undefined;
    let list = data.pages?.map(pageMap) ?? [
      {
        title: data.title,
        cover: data.pic,
        desc: data.desc,
        url: link + data.bvid,
        aid: data.aid,
        bvid: data.bvid,
        cid: data.cid,
        duration: data.duration,
        pubtime: data.pubdate,
        type: Types.MediaType.Video,
        isTarget: true,
        index: 0,
      },
    ];
    if (data.ugc_season) {
      const ep = data.ugc_season.sections
        .flatMap((v) => v.episodes)
        .find((v) =>
          options?.target ? v.id === options.target : v.aid === data.aid,
        );
      if (!ep) {
        if (options?.target) {
          throw new AppError(`No ugc ep for id ${options.target} found`);
        } else {
          throw new AppError(`No ugc ep for aid ${data.aid} found`);
        }
      }
      if ((data.pages?.length ?? 0) > 1) {
        const section_id = ep.section_id;
        const section = data.ugc_season.sections.find(
          (v) => v.id === section_id,
        );
        if (!section) {
          throw new AppError(
            `No ugc section for section_id ${section_id} found`,
          );
        }
        list = ep.pages.map(pageMap);
        sections = {
          target: ep.id,
          tabs: section.episodes.map((v) => ({
            id: v.id,
            name: v.title,
          })),
        };
      } else {
        const section_id = options?.target ?? ep.section_id;
        const section = data.ugc_season.sections.find(
          (v) => v.id === section_id,
        );
        if (!section) {
          throw new AppError(
            `No ugc section for section_id ${section_id} found`,
          );
        }
        list = section.episodes.map(map);
        sections = {
          target: section_id,
          tabs: data.ugc_season.sections.map((v) => ({
            id: v.id,
            name: v.title,
          })),
        };
      }
    }
    if (data.rights.is_stein_gate) {
      const player = await getPlayerInfo(data.aid, data.cid);
      const graph_version = player.interaction.graph_version;
      const edgeInfo = await getEdgeInfo(data.aid, graph_version);
      edge = {
        edge_id: 1,
        graph_version,
        list: edgeInfo.story_list,
        choices: edgeInfo.edges.questions?.[0].choices,
        vars: edgeInfo.hidden_vars,
      };
    }
    const tagsResp = await tryFetch(
      'https://api.bilibili.com/x/tag/archive/tags',
      { params },
    );
    return {
      type,
      id,
      nfo: {
        showtitle: data.ugc_season?.title ?? data.title,
        intro: data.desc,
        tags: (tagsResp as Resps.VideoTags).data.map((v) => v.tag_name),
        url: link + data.bvid,
        stat: {
          play: data.stat.view,
          danmaku: data.stat.danmaku,
          reply: data.stat.reply,
          like: data.stat.like,
          coin: data.stat.coin,
          favorite: data.stat.favorite,
          share: data.stat.share,
        },
        thumbs: [
          ...getPublicImages(data),
          ...getPublicImages(data.ugc_season, 'ugc_season'),
        ],
        premiered: data.pubdate,
        upper: {
          name: data.owner.name,
          mid: data.owner.mid,
          avatar: data.owner.face,
        },
      },
      edge,
      sections,
      list,
    };
  } else if (type === Types.MediaType.Bangumi) {
    const data = (body as Resps.BangumiInfo).result;
    const season = data.seasons.find((v) => v.season_id === data.season_id);
    const map = (ep: Resps.EpisodeInfo, index: number) => ({
      title: ep.show_title ?? ep.title ?? String(),
      cover: ep.cover,
      desc: data.evaluate,
      url: ep.share_url,
      aid: ep.aid,
      bvid: ep.bvid,
      cid: ep.cid,
      epid: ep.ep_id,
      ssid: data.season_id,
      duration: ep.duration / 1000,
      pubtime: ep.pub_time,
      type: Types.MediaType.Bangumi,
      isTarget: idNum === ep.id.toString(),
      index,
    });
    const list =
      data.section
        ?.find((v) => v.id === (options?.target ?? data.positive.id))
        ?.episodes.map(map) ?? data.episodes.map(map);
    return {
      type,
      id,
      nfo: {
        showtitle: data.season_title,
        intro: data.evaluate,
        tags: data.styles,
        url: data.share_url,
        stat: {
          play: data.stat.views,
          danmaku: data.stat.danmakus,
          reply: data.stat.reply,
          like: data.stat.likes,
          coin: data.stat.coins,
          favorite: data.stat.favorite,
          share: data.stat.share,
        },
        thumbs: [
          ...getPublicImages(data),
          ...getPublicImages(season, 'season'),
        ],
        premiered: data.episodes[0].pub_time,
        upper: data.up_info
          ? {
              name: data.up_info.uname,
              mid: data.up_info.mid,
              avatar: data.up_info.avatar,
            }
          : undefined,
        credits: {
          actors: data.actors.split('\n').map((actor) => {
            const [role, name] = actor.split(
              /(?:\u2014\u2014|\u2014|\uFF0F|\u3001)/,
            );
            return { name, role: role ?? '' };
          }),
          staff: mapBangumiStaffs(
            data.staff.split('\n').map((staff) => {
              const [name, role] = staff.split(
                /(?:\u2014\u2014|\u2014|\uFF0F|\u3001)/,
              );
              return [name, role];
            }),
          ),
        },
      },
      sections: {
        target: data.positive.id,
        tabs: [
          {
            id: data.positive.id,
            name: data.positive.title,
          },
          ...(data.section
            ? data.section.map((v) => ({
                id: v.id,
                name: v.title,
              }))
            : []),
        ],
      },
      list,
    };
  } else if (type === Types.MediaType.Lesson) {
    const data = (body as Resps.LessonInfo).data;
    return {
      type,
      id,
      nfo: {
        showtitle: data.title,
        intro: `${data.subtitle}\n${data.faq.title}\n${data.faq.content}`,
        tags: [],
        url: data.share_url,
        stat: {
          play: data.stat.play,
        },
        thumbs: [
          ...getPublicImages(data),
          ...data.brief.img.map((v, i) => ({
            id: 'brief-' + (i + 1),
            url: v.url,
          })),
        ],
        premiered: data.episodes[0].release_date,
        upper: {
          avatar: data.up_info.avatar,
          name: data.up_info.uname,
          mid: data.up_info.mid,
        },
      },
      list: data.episodes.map((ep, index) => ({
        title: ep.title,
        cover: ep.cover,
        desc: data.subtitle,
        url: data.share_url,
        aid: ep.aid,
        cid: ep.cid,
        epid: ep.id,
        ssid: data.season_id,
        duration: ep.duration,
        pubtime: ep.release_date,
        type: Types.MediaType.Lesson,
        isTarget: index === 0,
        index,
      })),
    };
  } else if (type === Types.MediaType.Music) {
    const data = (body as Resps.MusicInfo).data;
    const url = `https://www.bilibili.com/audio/au${data.id}`;
    const tagsResp = await tryFetch(
      'https://www.bilibili.com/audio/music-service-c/web/tag/song',
      { params },
    );
    const upperResp = await tryFetch(
      'https://www.bilibili.com/audio/music-service-c/web/user/info',
      { params: { uid: data.uid } },
    );
    const membersResp = await tryFetch(
      'https://www.bilibili.com/audio/music-service-c/web/member/song',
      { params },
    );
    const members = (membersResp as Resps.MusicMembersInfo).data;
    const user = (upperResp as Resps.MusicUpperInfo).data;
    return {
      type,
      id,
      nfo: {
        showtitle: data.title,
        intro: data.intro,
        tags: (tagsResp as Resps.MusicTagsInfo).data.map((v) => v.info),
        url,
        stat: {
          play: data.statistic.play,
          reply: data.statistic.comment,
          favorite: data.statistic.collect,
          share: data.statistic.share,
        },
        thumbs: getPublicImages(data),
        premiered: data.passtime,
        upper: {
          name: user.uname,
          mid: user.uid,
          avatar: user.avater ?? user.avatar, // Typo in API response, LMAO
        },
        credits: {
          actors: [],
          staff: mapMusicStaffs(
            members.map((member) => [
              member.type,
              member.list.map((v) => v.name.trim()).join('\uFF0F'),
            ]),
          ),
        },
      },
      list: [
        {
          title: data.title,
          cover: data.cover,
          desc: data.intro,
          url,
          aid: data.aid,
          sid: data.id,
          bvid: data.bvid,
          cid: data.cid,
          duration: data.duration,
          pubtime: data.passtime,
          type: Types.MediaType.Music,
          isTarget: true,
          index: 0,
        },
      ],
    };
  } else if (type === Types.MediaType.MusicList) {
    const link = `https://www.bilibili.com/audio/`;
    const data = (body as Resps.MusicListInfo).data;
    const listInfo = (await tryFetch(
      'https://www.bilibili.com/audio/music-service-c/web/song/of-menu',
      {
        params: { pn: options?.pn ?? 1, ps: 20, sid: data.menuId },
      },
    )) as Resps.MusicListDetailInfo;
    return {
      type,
      id,
      pn: true,
      nfo: {
        showtitle: data.title,
        intro: data.intro,
        tags: [],
        url: link + `am${data.menuId}`,
        stat: {
          play: data.statistic.play,
          reply: data.statistic.comment,
          favorite: data.statistic.collect,
          share: data.statistic.share,
        },
        thumbs: getPublicImages(data),
        premiered: data.ctime * 1000,
        upper: {
          name: data.uname,
          mid: data.uid,
          avatar: String(),
        },
      },
      list: listInfo.data.data.map((item, index) => ({
        title: item.title,
        cover: item.cover,
        desc: data.intro,
        url: link + `au${item.id}`,
        aid: item.aid,
        sid: item.id,
        bvid: item.bvid,
        cid: item.cid,
        duration: item.duration,
        pubtime: item.passtime,
        type: Types.MediaType.Music,
        isTarget: index === 0,
        index,
      })),
    };
  } else if (type === Types.MediaType.WatchLater) {
    const data = (body as Resps.WatchLaterInfo).data;
    const user = useUserStore();
    return {
      type,
      id,
      pn: true,
      nfo: {
        tags: [],
        stat: {},
        url: 'https://www.bilibili.com/watchlater/list',
        upper: {
          name: user.name,
          mid: user.mid,
          avatar: user.avatar,
        },
        thumbs: data.list.length ? getPublicImages(data.list[0]) : [],
      },
      list: data.list.map((item, index) => ({
        title: item.title,
        cover: item.pic,
        desc: item.desc,
        url: `https://www.bilibili.com/video/${item.bvid}`,
        aid: item.aid,
        bvid: item.bvid,
        duration: item.duration,
        pubtime: item.pubdate,
        type: Types.MediaType.Video,
        isTarget: index === 0,
        index,
      })),
    };
  } else if (type === Types.MediaType.Favorite) {
    const favoriteList = (body as Resps.FavoriteListInfo).data.list;
    const target = options?.target ?? favoriteList[0].id;
    const listBody = (await tryFetch(
      'https://api.bilibili.com/x/v3/fav/resource/list',
      {
        params: {
          media_id: target,
          pn: options?.pn ?? 1,
          ps: 36,
          platform: 'web',
        },
      },
    )) as Resps.FavoriteInfo;
    const { info, medias } = listBody.data;
    const typeMap: Record<number, Types.MediaType> = {
      2: Types.MediaType.Video,
      12: Types.MediaType.Music,
      24: Types.MediaType.Bangumi,
    };
    const list = medias.map((item, index) => ({
      title: item.title,
      cover: item.cover,
      desc: info.intro,
      url: `https://www.bilibili.com/video/${item.bvid}`,
      aid: item.id,
      fid: info.id,
      bvid: item.bvid,
      duration: item.duration,
      pubtime: item.pubtime,
      type: typeMap[item.type],
      isTarget: index === 0,
      index,
    }));
    return {
      type,
      id,
      pn: true,
      nfo: {
        showtitle: info.title,
        intro: info.intro,
        tags: [],
        url: `https://space.bilibili.com/${info.upper.mid}/favlist`,
        stat: {
          play: info.cnt_info.play,
          like: info.cnt_info.thumb_up,
          favorite: info.cnt_info.collect,
          share: info.cnt_info.share,
        },
        thumbs: getPublicImages(info),
        premiered: info.ctime * 1000,
        upper: {
          avatar: info.upper.face,
          name: info.upper.name,
          mid: info.upper.mid,
        },
      },
      sections: {
        target,
        tabs: favoriteList.map((v) => ({
          id: v.id,
          name: v.title,
        })),
      },
      list,
    };
  } else if (type === Types.MediaType.Opus) {
    const { common_card, user, id: opid } = (body as Resps.OpusInfo).data.item;
    const { stat, author } = await getOpusDetails(id);
    const title = common_card.nodes.find(
      (v) => v.type === 'RICH_TEXT_NODE_TYPE_TEXT',
    )?.text;
    if (!title) {
      throw new AppError('No title found for opus ' + id);
    }
    const url = `https://www.bilibili.com/opus/${opid}`;
    return {
      type,
      id,
      nfo: {
        showtitle: title,
        intro: title,
        tags: [],
        url,
        stat: {
          coin: stat?.coin.count,
          reply: stat?.comment.count,
          favorite: stat?.favorite.count,
          share: stat?.forward.count,
          like: stat?.like.count,
        },
        upper: await getUserInfo(user.mid),
        thumbs: getPublicImages(common_card),
      },
      list: [
        {
          title,
          cover: common_card.cover,
          desc: title,
          url,
          opid,
          duration: 0,
          pubtime: author?.pub_ts ?? 0,
          type: Types.MediaType.Opus,
          isTarget: true,
          index: 0,
        },
      ],
    };
  } else if (type === Types.MediaType.UserVideo) {
    const { seasons_list, series_list } = (body as Resps.UploadsSeriesInfo).data
      .items_lists;
    const upper = await getUserInfo(idNum);
    let sections = undefined;
    let nfo;
    let list;
    if (seasons_list.length || series_list.length) {
      let target = options?.target;
      let archives;
      let meta;

      if (seasons_list.length) {
        if (!target) target = seasons_list[0].meta.season_id;
        const listBody = (await tryFetch(
          'https://api.bilibili.com/x/polymer/web-space/seasons_archives_list',
          {
            params: {
              ...params,
              season_id: target,
            },
          },
        )) as Resps.UploadsArchivesInfo;
        sections = {
          target,
          tabs: seasons_list.map((v) => ({
            id: v.meta.season_id,
            name: v.meta.name,
          })),
        };
        archives = listBody.data.archives;
        meta = seasons_list.find((v) => v.meta.season_id === target)?.meta;
      } else {
        if (!target) target = series_list[0].meta.series_id;
        const listBody = (await tryFetch(
          'https://api.bilibili.com/x/series/archives',
          {
            params: {
              ...params,
              series_id: target,
            },
          },
        )) as Resps.UploadsArchivesInfo;
        sections = {
          target,
          tabs: series_list.map((v) => ({
            id: v.meta.series_id,
            name: v.meta.name,
          })),
        };
        archives = listBody.data.archives;
        meta = series_list.find((v) => v.meta.series_id === target)?.meta;
      }

      if (!meta) throw new AppError(`No meta found for target ${target}`);

      nfo = {
        showtitle: meta.name,
        intro: meta.description,
        tags: [],
        url: `https://space.bilibili.com/${upper.mid}/lists/${target}`,
        stat: {},
        upper,
        thumbs: getPublicImages(meta),
        premiered: meta.ptime,
      };
      list = archives.map((item, index) => ({
        title: item.title,
        cover: item.pic,
        desc: meta.description, // fallback
        url: `https://www.bilibili.com/video/${item.bvid}`,
        aid: item.aid,
        bvid: item.bvid,
        duration: item.duration,
        pubtime: item.pubdate,
        type: Types.MediaType.Video,
        isTarget: index === 0,
        index,
      }));
    } else {
      const listBody = (await tryFetch(
        'https://api.bilibili.com/x/space/wbi/arc/search',
        {
          params: {
            mid: idNum,
            ps: 25,
            pn: options?.pn ?? 1,
          },
          auth: 'wbi',
        },
      )) as Resps.UploadsInfo;
      const { vlist } = listBody.data.list;
      nfo = {
        tags: [],
        stat: {},
        url: `https://space.bilibili.com/${upper.mid}/upload/video`,
        upper,
        thumbs: getPublicImages(vlist[0]),
      };
      list = vlist.map((item, index) => ({
        title: item.title,
        cover: item.pic,
        desc: item.description,
        url: `https://www.bilibili.com/video/${item.bvid}`,
        aid: item.aid,
        bvid: item.bvid,
        duration: item.length.split(':').reduce((h, s) => h * 60 + +s, 0),
        pubtime: item.created,
        type: Types.MediaType.Video,
        isTarget: index === 0,
        index,
      }));
    }
    return {
      type,
      id,
      pn: true,
      sections,
      nfo,
      list,
    };
  } else if (type === Types.MediaType.UserOpus) {
    const { items, offset } = (body as Resps.UserOpusInfo).data;
    const upper = await getUserInfo(idNum);
    const url = `https://space.bilibili.com/${upper.mid}/upload/opus`;
    const cover = items[0].cover;
    return {
      type,
      id,
      pn: true,
      nfo: {
        tags: [],
        stat: {},
        upper,
        url,
        thumbs: cover
          ? [
              {
                id: 'cover',
                url: cover.url,
              },
            ]
          : [],
      },
      offset,
      list: items.map((item, index) => ({
        title: item.content,
        cover: item.cover?.url ?? '',
        desc: item.content,
        url,
        opid: item.opus_id,
        duration: 0,
        pubtime: 0,
        type: Types.MediaType.Opus,
        isTarget: index === 0,
        index,
      })),
    };
  } else if (type === Types.MediaType.UserAudio) {
    const { data } = (body as Resps.UserAudioInfo).data;
    const upper = await getUserInfo(idNum);
    return {
      type,
      id,
      pn: true,
      nfo: {
        tags: [],
        stat: {},
        url: `https://space.bilibili.com/${upper.mid}/upload/audio`,
        upper,
        thumbs: getPublicImages(data[0]),
      },
      list: data.map((item, index) => ({
        title: item.title,
        cover: item.cover,
        desc: item.title,
        url: `https://www.bilibili.com/audio/au${item.id}`,
        aid: item.aid,
        sid: item.id,
        bvid: item.bvid,
        cid: item.cid,
        duration: item.duration,
        pubtime: item.passtime,
        type: Types.MediaType.Music,
        isTarget: index === 0,
        index,
      })),
    };
  } else throw new AppError('No type named ' + type);
}

export async function getPlayUrl(
  item: Types.MediaItem,
  type: Types.MediaType,
  codec: Types.StreamFormat,
): Promise<Types.PlayUrlProvider> {
  let url = 'https://api.bilibili.com';
  const user = useUserStore();
  const params: Record<string, number | undefined> = {
    qn: user.isLogin ? 127 : 64,
    fnver: 0,
    fnval: 16,
    fourk: 1,
  };
  switch (codec) {
    case Types.StreamFormat.Flv:
      params.fnval = 0;
      break;
    case Types.StreamFormat.Mp4:
      params.fnval = 1;
      break;
    case Types.StreamFormat.Dash:
      params.fnval = user.isLogin ? 4048 : 16;
      break;
  }
  switch (type) {
    case Types.MediaType.Video:
      url += '/x/player/wbi/playurl';
      Object.assign(params, {
        avid: item.aid,
        cid: item.cid,
      });
      break;
    case Types.MediaType.Bangumi:
      url += '/pgc/player/web/v2/playurl';
      Object.assign(params, {
        ep_id: item.epid,
        season_id: item.ssid,
      });
      break;
    case Types.MediaType.Lesson:
      url += '/pugv/player/web/playurl';
      Object.assign(params, {
        avid: item.aid,
        cid: item.cid,
        ep_id: item.epid,
        season_id: item.ssid,
      });
      break;
    case Types.MediaType.Music:
      url = 'https://www.bilibili.com/audio/music-service-c/web/url';
      Object.assign(params, {
        sid: item.sid,
        privilege: 2,
        quality: 0,
      });
      break;
  }
  const body = await tryFetch(url, {
    params,
    auth: 'wbi',
  });
  if (type === Types.MediaType.Music) {
    const info = body as Resps.MusicPlayUrlInfo;
    const data = info.data;
    const audio = [
      {
        id: { 0: 30228, 1: 30280, 2: 30380, 3: 30252 }[data.type] ?? -1,
        baseUrl: data.cdns[0],
        backupUrl: data.cdns,
      },
    ];
    const codec = Types.StreamFormat.Dash;
    return { audio, codec };
  } else {
    const data = (body.result?.video_info ??
      body?.result ??
      body?.data) as Resps.VideoPlayUrlInfo['data'];
    if (data.durls?.length) {
      const video = data.durls.map((v) => ({
        id: v.quality,
        baseUrl: v.durl[0].url,
        backupUrl: v.durl[0].backup_url,
        size: v.durl[0].size,
      }));
      const codec = Types.StreamFormat.Mp4;
      return { video, codec };
    } else if (data.durl?.length) {
      const video = (
        await Promise.all(
          data.accept_quality.map(async (qn) => {
            params.qn = qn;
            const info =
              qn === data.quality
                ? body
                : ((await tryFetch(url, { params })) as Resps.VideoPlayUrlInfo);
            const result =
              info.result?.video_info ?? info?.result ?? info?.data;
            const durl = result.durl?.[0];
            if (durl)
              return {
                id: result.quality,
                baseUrl: durl.url,
                backupUrl: durl.backup_url,
                size: durl.size,
              };
          }),
        )
      ).filter(Boolean) as Types.PlayUrlResult[];
      const codec = data.accept_format.includes('flv')
        ? Types.StreamFormat.Flv
        : Types.StreamFormat.Mp4;
      return { video, codec };
    } else if (data.dash) {
      const video = data.dash.video?.length ? data.dash.video : [];
      const audio = [
        ...(data.dash.audio?.length ? data.dash.audio : []),
        ...(data.dash.dolby?.audio?.length ? [data.dash.dolby.audio[0]] : []),
        ...(data.dash.flac?.audio ? [data.dash.flac.audio] : []),
      ];
      const codec = Types.StreamFormat.Dash;
      return { video, audio, codec };
    } else throw new AppError(body.message, { code: body.code });
  }
}

export async function getCid(aid: number) {
  const body = await tryFetch('https://api.bilibili.com/x/player/pagelist', {
    params: { aid },
  });
  return body.data[0].cid as number;
}
