import { AppError } from '../error';
import { tryFetch } from '../utils';
import * as Types from '@/types/media/opus.d';

export async function getOpusDetails(id: string) {
  const prefix = id.startsWith('cv') ? 'read' : 'opus';
  const text = await tryFetch(`https://www.bilibili.com/${prefix}/${id}`, {
    type: 'text',
  });
  const html = new DOMParser().parseFromString(text, 'text/html');
  const obj = html.body
    .querySelector('script')
    ?.textContent.match(
      /window\.__INITIAL_STATE__\s*=\s*([\s\S]*?)(?=;\(\s*function)/,
    )?.[1];
  if (!obj) {
    throw new AppError('No __INITIAL_STATE__ found in HTML.');
  }
  const json = JSON.parse(obj) as Types.OpusResp;
  const modules = json.detail.modules;
  const title = modules.find(
    (v) => v.module_type === 'MODULE_TYPE_TITLE',
  )?.module_title;
  const top = modules.find(
    (v) => v.module_type === 'MODULE_TYPE_TOP',
  )?.module_top;
  const author = modules.find(
    (v) => v.module_type === 'MODULE_TYPE_AUTHOR',
  )?.module_author;
  const stat = modules.find(
    (v) => v.module_type === 'MODULE_TYPE_STAT',
  )?.module_stat;
  const content = modules.find(
    (v) => v.module_type === 'MODULE_TYPE_CONTENT',
  )?.module_content;
  return {
    id: json.id,
    title,
    top,
    author,
    stat,
    content,
  };
}

const toHttpsUrl = (url: string): string => {
  if (url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('http://')) {
    return 'https://' + url.slice(7);
  }
  if (url.startsWith('//')) {
    return 'https:' + url;
  }
  return 'https://' + url;
};

function handleOpusNode(
  id: string,
  nodes: Types.OpusContentNode[],
  options?: {
    quote?: boolean;
  },
) {
  let h2 = false;
  let line = '';
  for (const n of nodes) {
    let p = '';
    if (n.type === 'TEXT_NODE_TYPE_WORD') {
      const { color, font_size, style } = n.word;
      const words = n.word.words.replaceAll('\u00A0', '&nbsp;');
      p = words;

      if (color) {
        p = `<span style="color:${color}">${words}</span>`;
      }
      if (options?.quote && words === '\u000A') {
        p = '<br>\n> ';
      }
      if (n.word.words.trim().length !== n.word.words.length) {
        if (style?.bold) {
          p = `<strong>${words}</strong>`;
        }
      } else {
        if (font_size === 24) {
          h2 = true;
        }
        if (style?.bold) {
          p = `**${words}**`;
        }
      }
    }
    if (n.type === 'TEXT_NODE_TYPE_RICH') {
      const { style } = n.rich;
      const rich = n.rich;
      if (style?.font_size === 24) {
        h2 = true;
      }
      let src = '';
      switch (rich.type) {
        case 'RICH_TEXT_NODE_TYPE_AT':
          src = `https://space.bilibili.com/${rich.rid}`;
          break;
        case 'RICH_TEXT_NODE_TYPE_BV':
        case 'RICH_TEXT_NODE_TYPE_TOPIC':
        case 'RICH_TEXT_NODE_TYPE_WEB':
          src = rich.jump_url;
          break;
        case 'RICH_TEXT_NODE_TYPE_EMOJI':
          src = rich.emoji.icon_url;
          break;
        case 'RICH_TEXT_NODE_TYPE_GOODS':
          src = rich.goods.jump_url;
          break;
        case 'RICH_TEXT_NODE_TYPE_VOTE':
          src += `http://t.bilibili.com/vote/h5/result?vote_id=${rich.rid}&dynamic_id=${id}`;
          break;
        case 'RICH_TEXT_NODE_TYPE_LOTTERY':
          src += `https://www.bilibili.com/h5/lottery/result?business_id=${id}`;
          break;
      }
      p = `![](${toHttpsUrl(src)})`;
    }
    line += p;
  }
  return {
    line,
    h2,
    quote: options?.quote ?? false,
  };
}

export async function getOpusMarkdown(title: string, opid: string) {
  const { id, top, author, stat, content } = await getOpusDetails(opid);
  let md = `# ${title}\n\n`;

  for (const p of top?.display.album.pics ?? []) {
    md += `![](${toHttpsUrl(p.url)})\n\n`;
  }

  if (author) {
    md += `> 作者：[${author.name}](https://space.bilibili.com/${author.mid})\n\n`;
  }

  if (stat) {
    const s = [
      ['👍 喜欢', stat.like?.count],
      ['🪙 投币', stat.coin?.count],
      ['⭐ 收藏', stat.favorite?.count],
      ['🔁 转发', stat.forward?.count],
      ['💬 评论', stat.comment?.count],
    ]
      .filter(([, v]) => typeof v === 'number')
      .map(([k, v]) => `${k}: ${v}`)
      .join(' | ');
    md += `> ${s}\n\n`;
  }

  for (const p of content?.paragraphs ?? []) {
    const t = p.para_type;
    let line = '';
    let quote = false;
    let h2 = false;
    if (t === 1 || t === 4) {
      if (t === 4) quote = true;
      const r = handleOpusNode(id, p.text.nodes, {
        quote: t === 4,
      });
      line += r.line;
      h2 = r.h2;
      quote = r.quote;
    }
    if (t === 2) {
      for (const n of p.pic.pics) {
        const { height, url: src } = n;
        line += `<p align=center><img src="${toHttpsUrl(src)}" height=${height} /></p>`;
      }
    }
    if (t === 3) {
      const { height, url: src } = p.line.pic;
      line += `<p align=center><img src="${toHttpsUrl(src)}" height=${height} /></p>`;
    }
    if (t === 5) {
      for (const [i, n] of p.list.items.entries()) {
        line += `${'\u0020'.repeat(n.level)} `;
        let prefix = `${i}. `;
        if (p.list.style === 2) {
          prefix = '- ';
        }
        line += prefix;
        const r = handleOpusNode(id, n.nodes);
        line += r.line;
        h2 = r.h2;
        quote = r.quote;
        line += '\n';
      }
    }
    if (t === 6) {
      const { opus, item_null } = p.link_card.card;
      const title = opus?.title ?? item_null?.text;
      const jump_url = toHttpsUrl(opus?.jump_url ?? '');
      line += `[${title}](${jump_url})`;
    }
    if (p.align) {
      const map = {
        0: 'left',
        1: 'center',
        2: 'right',
      };
      line = `<p align=${map[p.align]}>${line}</p>`;
    }
    if (h2) line = `## ${line}`;
    if (quote) line = `> ${line}`;
    md += `${line}\n\n`;
  }
  return new TextEncoder().encode(md);
}

export async function getOpusImages(opid: string) {
  const { top, content } = await getOpusDetails(opid);
  return [
    ...(top?.display.album.pics.map(v => v.url) ?? []),
    ...(content?.paragraphs.filter(v => v.para_type === 2).flatMap(v => v.pic.pics.map(v => v.url)) ?? [])
  ].map(v => v.replace('http:', 'https:'));
}
