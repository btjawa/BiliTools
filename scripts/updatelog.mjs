// Reference https://github.com/lencx/tauri-tutorial/blob/main/scripts/updatelog.mjs

import fs from 'fs';
import path from 'path';

const CHANGELOG = 'CHANGELOG.md';

// e.g. [0.0.0] - 2020-01-01
const regex = /^[^\[]*\[([0-9A-Za-z._+\-]+)\]\s*-\s*(\d{4}-\d{2}-\d{2})\b/;
const file = path.join(process.cwd(), CHANGELOG);

if (!fs.existsSync(file)) {
    console.error('Could not found ' + CHANGELOG);
    process.exit(1);
}

const targetTag = (process.argv[2]?.slice(1)) ?? null;

const content = fs.readFileSync(file, { encoding: 'utf-8' }).split('\n');
let tag = null;
const contents = [];

for (const line of content) {
    const _tag = line.match(regex)?.[1];
    if (_tag) {
        if (tag) break;
        if (_tag === targetTag) tag = _tag;

    } else if (tag) {
        contents.push(line);
    }
}

if (!tag || !contents.length) {
    console.error('Could not found any valid contents');
}

const body = contents.join('\n').trim().replace(/\r\n/g, '\n');;

if (!process.env.GITHUB_OUTPUT) {
    console.log({ tag, body });
    process.exit(1);
}

const delim = 'LOG_' + Math.random().toString(36).slice(2);
fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `body<<${delim}\n${body}\n${delim}\n`,
    'utf8'
);