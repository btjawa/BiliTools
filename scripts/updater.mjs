// https://github.com/lencx/tauri-tutorial/blob/main/scripts/updater.mjs

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { execSync } from 'child_process';
import { getOctokit, context } from '@actions/github';

const token = process.env.GITHUB_TOKEN;
const CHANGELOG = 'CHANGELOG.md';

// Modified from https://github.com/lencx/tauri-tutorial/blob/main/scripts/updatelog.mjs
function updatelog(tag, type = 'updater') {
  const reTag = /\[.*?\] - \d+-\d+-\d+/; // e.g. [0.0.0] - 2020-01-01

  const file = path.join(process.cwd(), CHANGELOG);

  if (!fs.existsSync(file)) {
    console.log('Could not found CHANGELOG.md');
    process.exit(1);
  }

  let _tag;
  const tagMap = {};
  const content = fs.readFileSync(file, { encoding: 'utf8' }).split('\n');

  content.forEach((line, index) => {
    if (reTag.test(line)) {
      _tag = line.match(reTag)[0].split(']')[0].slice(1).trim();
      if (!tagMap[_tag]) {
        tagMap[_tag] = [];
        return;
      }
    }
    if (_tag) {
      tagMap[_tag].push(line);
    }
    if (reTag.test(content[index + 1])) {
      _tag = null;
    }
  });
  
  if (!tagMap?.[tag]) {
    console.log(
      `${type === 'release' ? '[CHANGELOG.md] ' : ''}Tag ${tag} does not exist`
    );
    process.exit(1);
  }

  return tagMap[tag].join('\n').trim() || '';
}

async function updater() {
  if (!token) {
    console.log('GITHUB_TOKEN is required');
    process.exit(1);
  }

  // 用户名，仓库名
  const options = { owner: context.repo.owner, repo: context.repo.repo };
  const github = getOctokit(token);

  // 获取 tag
  const { data: tags } = await github.rest.repos.listTags({
    ...options,
    per_page: 10,
    page: 1,
  });

  // 过滤包含 `v` 版本信息的 tag
  const tag = tags.find((t) => t.name.startsWith('v'));
  // console.log(`${JSON.stringify(tag, null, 2)}`);

  if (!tag) return;

  // 获取此 tag 的详细信息
  const { data: latestRelease } = await github.rest.repos.getReleaseByTag({
    ...options,
    tag: tag.name,
  });

  // 需要生成的静态 json 文件数据，根据自己的需要进行调整
  const updateData = {
    version: tag.name,
    // 使用 UPDATE_LOG.md，如果不需要版本更新日志，则将此字段置空
    notes: updatelog(tag.name.slice(1)),
    pub_date: new Date().toISOString(),
    platforms: {
      'windows-x86_64': { signature: '', url: '' },
      'darwin-x86_64': { signature: '', url: '' },
      'darwin-aarch64': { signature: '', url: '' },
      // 'linux-x86_64': { signature: '', url: '' },
    },
  };

  const setAsset = async (asset, reg, platform) => {
    let sig = '';
    if (/.sig$/.test(asset.name)) {
      sig = await getSignature(`https://ghproxy.net/${asset.browser_download_url}`);
    }
    if (reg.test(asset.name)) {
      // 设置平台签名，检测应用更新需要验证签名
      if (sig) {
        updateData.platforms[platform].signature = sig;
        return;
      }
      // 设置下载链接
      updateData.platforms[platform].url = `https://ghproxy.net/${asset.browser_download_url}`;
    }
  };

  const promises = latestRelease.assets.map(async (asset) => {
    await setAsset(asset, /.nsis.zip/, 'windows-x86_64');
    await setAsset(asset, /x64.app.tar.gz/, 'darwin-x86_64');
    await setAsset(asset, /aarch64.app.tar.gz/, 'darwin-aarch64');
    // await setAsset(asset, /.AppImage.tar.gz/, 'linux-x86_64');
  });
  await Promise.allSettled(promises);

  if (!fs.existsSync('updater')) {
    fs.mkdirSync('updater');
  }
  const data = JSON.stringify(updateData, null, 2);
  console.log(data);
  // 将数据写入文件
  fs.writeFileSync('./install.json', data);
  console.log('Generate install.json');
  execSync('git config user.name github-actions');
  execSync('git config user.email github-actions@github.com');
  execSync('git add -A');
  execSync(`git commit -m "Update install.json"`);
  execSync(`git push origin HEAD:master`);
  console.log(`Publish Successfully...`);
}

updater().catch(console.error);

// 获取签名内容
async function getSignature(url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/octet-stream' },
    });
    return response.text();
  } catch (_) {
    return '';
  }
}