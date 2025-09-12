import { SourceMapConsumer, RawSourceMap, MappedPosition } from 'source-map-js';
import StackTrace from 'stacktrace-js';
import { TauriError } from './backend';
import { AppLog } from './utils';

const cache = new Map<string, SourceMapConsumer>();
if (import.meta.env.PROD) getConsumer(import.meta.url);

async function getConsumer(url: string) {
  if (cache.has(url)) {
    return cache.get(url)!;
  }
  try {
    const resp = await window.fetch(url + '.map');
    if (!resp.ok) throw null;
    const map = (await resp.json()) as RawSourceMap;
    const consumer = new SourceMapConsumer(map);
    cache.set(url, consumer);
    return consumer;
  } catch (_) {
    return null;
  }
}

export class AppError extends Error {
  original?: Error;
  constructor(
    input: unknown,
    options?: { code?: number | string; name?: string },
  ) {
    const data = AppError.parse(input, options);
    super(data.message);
    Object.assign(this, data);
  }
  static parse(
    input: unknown,
    options?: { code?: number | string; name?: string },
  ) {
    if (input instanceof AppError) {
      return {
        message: input.message,
        name: input.name,
        original: input.original ?? input,
      };
    }
    if (input instanceof Error) {
      return {
        message: input.message,
        name: options?.name ?? input.name ?? 'AppError',
        original: input,
      };
    }
    if (typeof input === 'string') {
      return {
        message: options?.code ? `${input} (${options.code})` : input,
        name: options?.name ?? 'AppError',
      };
    }
    // fallback
    const err = input as TauriError;
    const message = err.message + (err.code ? ` (${err.code})` : '');
    return {
      message,
      name: options?.name ?? 'AppError',
    };
  }
  async handle() {
    const frames = await StackTrace.fromError(this.original ?? this);
    if (import.meta.env.DEV) {
      console.log('Got StackFrames for ' + this.message + '\n', frames);
      const stack = (this.original ?? this).stack;
      return AppLog(stack ?? '', 'error');
    }
    const stack: string[] = [];
    const raw: MappedPosition[] = [];
    for (const v of frames.filter((v) => v.fileName)) {
      const f = v.fileName!;
      const l = v.lineNumber;
      const c = v.columnNumber;
      const consumer = await getConsumer(new URL(f, import.meta.url).href);
      if (consumer && l && c) {
        const orig = consumer.originalPositionFor({
          line: l,
          column: c,
          bias: SourceMapConsumer.GREATEST_LOWER_BOUND,
        });
        if (orig.source.startsWith('/node_modules')) {
          continue;
        }
        let line = `${orig.source}:${orig.line}:${orig.column}`;
        if (orig.name) line += ` (${orig.name})`;
        stack.push('    at ' + line);
        raw.push(orig);
      } else {
        stack.push('<anonymous>');
      }
    }
    console.log('Got MappedPositions for ' + this.message + '\n', raw);
    return AppLog(
      `${this.name}: ${this.message}\n` + stack.join('\n'),
      'error',
    );
  }
}
