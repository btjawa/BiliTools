import { AppError } from '../error';
import { tryFetch } from '../utils';
import * as Types from '@/types/media/opus.d';

export async function getOpusInfo(id: string) {
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
