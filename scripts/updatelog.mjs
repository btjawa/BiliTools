import fs from 'fs';
import path from 'path';

const CHANGELOG = 'CHANGELOG.md';

export default function updatelog(tag, type = 'updater') {
  const reTag = /\[.*?\] - \d+-\d+-\d+/; // e.g. [0.0.0] - 2020-01-01

  const file = path.join(process.cwd(), CHANGELOG);

  if (!fs.existsSync(file)) {
    console.log('Could not found ' + CHANGELOG);
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
      `${type === 'release' ? `${CHANGELOG}] ` : ''}Tag ${tag} does not exist`
    );
    process.exit(1);
  }

  return tagMap[tag].join('\n').trim() || '';
}