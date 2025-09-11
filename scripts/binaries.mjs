import { execSync } from 'child_process';
import path from 'path';

const SIDECARS = ['aria2c', 'ffmpeg', 'DanmakuFactory'];

// https://tauri.app/develop/sidecar/

const extension = process.platform === 'win32' ? '.exe' : '';

const rustInfo = execSync('rustc -vV');
const targetTriple = /host: (\S+)/g.exec(rustInfo)[1];
if (!targetTriple) {
    console.error('Failed to determine platform target triple');
    process.exit(1);
}

for (const name of SIDECARS) {
    const file = path.resolve(
        process.cwd(),
        'src-tauri',
        'binaries',
        `${name}-${targetTriple}${extension}`
    );
    const args = [];
    switch (name) {
        case 'aria2c':
            args.push('-v');
            break;
        case 'ffmpeg':
            args.push('-version');
            break;
        case 'DanmakuFactory':
            args.push('--help');
            break;
    }
    try {
        const output = execSync(`${file} ${args.join(' ')}`, { stdio: 'pipe' });
        console.log(`${name} OK:\n${output.toString()}`);
    } catch (err) {
        console.error(`${name} failed:`, err.message);
        process.exit(1);
    }
}