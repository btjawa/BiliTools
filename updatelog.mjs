import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHANGELOG = 'CHANGELOG.md';

const vtag = execSync('git describe --tags --abbrev=0').toString().trim();

if (!vtag) {
  console.error('No tag found');
  process.exit(1);
}

const tag = vtag.slice(1);

const reTag = /\[.*?\] - \d+-\d+-\d+/; // e.g. [0.0.0] - 2020-01-01

const file = path.join(process.cwd(), CHANGELOG);

if (!fs.existsSync(file)) {
  console.error('Could not found ' + CHANGELOG);
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
  console.error(`Tag ${tag} does not exist`);
  process.exit(1);
}

console.log(tagMap[tag].join('\\n').trim() || '');
