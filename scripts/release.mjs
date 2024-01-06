import { createRequire } from 'module';
import { execSync } from 'child_process';
import fs from 'fs';

import updatelog from './updatelog.mjs';

const require = createRequire(import.meta.url);

async function release() {
  const flag = process.argv[2] ?? 'patch';
  const increment = process.argv[3] ? parseInt(process.argv[3], 10) : 1; // 解析第三个参数或默认为 1
  const packageJson = require('../package.json');
  const tauriConfig = require('../src-tauri/tauri.conf.json');
  let [a, b, c] = packageJson.version.split('.').map(Number);

  switch (flag) {
    case 'major':
      a += increment; b = 0; c = 0;
      break;
    case 'minor':
      b += increment; c = 0;
      break;
    case 'patch':
      c += increment;
      break;
    default:
      console.log(`Invalid flag "${flag}"`);
      process.exit(1);
  }

  const nextVersion = `${a}.${b}.${c}`;
  tauriConfig.package.version = nextVersion;
  packageJson.version = nextVersion;

  const nextTag = `v${nextVersion}`;
  await updatelog(nextTag, 'release');

  // 将新版本写入 package.json 与 tauri.conf.json 文件
  fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
  fs.writeFileSync('./src-tauri/tauri.conf.json', JSON.stringify(tauriConfig, null, 2));

  // 提交文件，打 tag 标签（tag 标签是为了触发 github action 工作流）并推送到远程
  execSync('git add -A');
  execSync(`git commit -m "v${nextVersion}"`);
  execSync(`git tag -a v${nextVersion} -m "v${nextVersion}"`);
  execSync(`git push`);
  execSync(`git push origin v${nextVersion}`);
  console.log(`Publish Successfully...`);
}

release().catch(console.error);