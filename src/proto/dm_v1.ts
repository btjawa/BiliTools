// Generated from https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/grpc_api/bilibili/community/service/dm/v1/dm.proto
/**
 * Convert DmSegMobileReply binary to readable XML.
 * @author https://github.com/btjawa
 * @license GPL-3.0-or-later
 */
export function DmSegMobileReplyToXML(binary: Uint8Array, options?: { inputXml?: Document }) {
  const decoded = decodeDmSegMobileReply(binary);
  if (decoded?.elems) {
    const xmlDoc = options?.inputXml || new DOMParser().parseFromString('<?xml version="1.0" encoding="UTF-8"?><i></i>', "application/xml");
    const iElement = xmlDoc.querySelector("i");
    decoded.elems.forEach(elem => {
      const dElement = xmlDoc.createElement("d");
      dElement.setAttribute("p", [
        (elem.progress || 0) / 1000,
        elem.mode,
        elem.fontsize,
        elem.color,
        elem.ctime?.low,
        elem.pool || 0,
        elem.midHash,
        elem.idStr,
      ].join(','));
      dElement.textContent = elem.content || '';
      iElement?.appendChild(dElement);
    });
    return new XMLSerializer().serializeToString(xmlDoc);
  } else throw new Error('No danmaku elems found');
}

export const enum DmColorfulType {
  NoneType = "NoneType",
  VipGradualColor = "VipGradualColor",
}

export const encodeDmColorfulType: { [key: string]: number } = {
  NoneType: 0,
  VipGradualColor: 60001,
};

export const decodeDmColorfulType: { [key: number]: DmColorfulType } = {
  0: DmColorfulType.NoneType,
  60001: DmColorfulType.VipGradualColor,
};

export interface DmSegMobileReply {
  elems?: DanmakuElem[];
  state?: number;
  ai_flag?: DanmakuAIFlag;
  colorfulSrc?: DmColorful[];
}

export function encodeDmSegMobileReply(message: DmSegMobileReply): Uint8Array {
  let bb = popByteBuffer();
  _encodeDmSegMobileReply(message, bb);
  return toUint8Array(bb);
}

function _encodeDmSegMobileReply(message: DmSegMobileReply, bb: ByteBuffer): void {
  // repeated DanmakuElem elems = 1;
  let array$elems = message.elems;
  if (array$elems !== undefined) {
    for (let value of array$elems) {
      writeVarint32(bb, 10);
      let nested = popByteBuffer();
      _encodeDanmakuElem(value, nested);
      writeVarint32(bb, nested.limit);
      writeByteBuffer(bb, nested);
      pushByteBuffer(nested);
    }
  }

  // optional int32 state = 2;
  let $state = message.state;
  if ($state !== undefined) {
    writeVarint32(bb, 16);
    writeVarint64(bb, intToLong($state));
  }

  // optional DanmakuAIFlag ai_flag = 3;
  let $ai_flag = message.ai_flag;
  if ($ai_flag !== undefined) {
    writeVarint32(bb, 26);
    let nested = popByteBuffer();
    _encodeDanmakuAIFlag($ai_flag, nested);
    writeVarint32(bb, nested.limit);
    writeByteBuffer(bb, nested);
    pushByteBuffer(nested);
  }

  // repeated DmColorful colorfulSrc = 5;
  let array$colorfulSrc = message.colorfulSrc;
  if (array$colorfulSrc !== undefined) {
    for (let value of array$colorfulSrc) {
      writeVarint32(bb, 42);
      let nested = popByteBuffer();
      _encodeDmColorful(value, nested);
      writeVarint32(bb, nested.limit);
      writeByteBuffer(bb, nested);
      pushByteBuffer(nested);
    }
  }
}

export function decodeDmSegMobileReply(binary: Uint8Array): DmSegMobileReply {
  return _decodeDmSegMobileReply(wrapByteBuffer(binary));
}

function _decodeDmSegMobileReply(bb: ByteBuffer): DmSegMobileReply {
  let message: DmSegMobileReply = {} as any;

  end_of_message: while (!isAtEnd(bb)) {
    let tag = readVarint32(bb);

    switch (tag >>> 3) {
      case 0:
        break end_of_message;

      // repeated DanmakuElem elems = 1;
      case 1: {
        let limit = pushTemporaryLength(bb);
        let values = message.elems || (message.elems = []);
        values.push(_decodeDanmakuElem(bb));
        bb.limit = limit;
        break;
      }

      // optional int32 state = 2;
      case 2: {
        message.state = readVarint32(bb);
        break;
      }

      // optional DanmakuAIFlag ai_flag = 3;
      case 3: {
        let limit = pushTemporaryLength(bb);
        message.ai_flag = _decodeDanmakuAIFlag(bb);
        bb.limit = limit;
        break;
      }

      // repeated DmColorful colorfulSrc = 5;
      case 5: {
        let limit = pushTemporaryLength(bb);
        let values = message.colorfulSrc || (message.colorfulSrc = []);
        values.push(_decodeDmColorful(bb));
        bb.limit = limit;
        break;
      }

      default:
        skipUnknownField(bb, tag & 7);
    }
  }

  return message;
}

export interface DanmakuElem {
  id?: Long;
  progress?: number;
  mode?: number;
  fontsize?: number;
  color?: number;
  midHash?: string;
  content?: string;
  ctime?: Long;
  weight?: number;
  action?: string;
  pool?: number;
  idStr?: string;
  attr?: number;
  animation?: string;
  colorful?: DmColorfulType;
}

export function encodeDanmakuElem(message: DanmakuElem): Uint8Array {
  let bb = popByteBuffer();
  _encodeDanmakuElem(message, bb);
  return toUint8Array(bb);
}

function _encodeDanmakuElem(message: DanmakuElem, bb: ByteBuffer): void {
  // optional int64 id = 1;
  let $id = message.id;
  if ($id !== undefined) {
    writeVarint32(bb, 8);
    writeVarint64(bb, $id);
  }

  // optional int32 progress = 2;
  let $progress = message.progress;
  if ($progress !== undefined) {
    writeVarint32(bb, 16);
    writeVarint64(bb, intToLong($progress));
  }

  // optional int32 mode = 3;
  let $mode = message.mode;
  if ($mode !== undefined) {
    writeVarint32(bb, 24);
    writeVarint64(bb, intToLong($mode));
  }

  // optional int32 fontsize = 4;
  let $fontsize = message.fontsize;
  if ($fontsize !== undefined) {
    writeVarint32(bb, 32);
    writeVarint64(bb, intToLong($fontsize));
  }

  // optional uint32 color = 5;
  let $color = message.color;
  if ($color !== undefined) {
    writeVarint32(bb, 40);
    writeVarint32(bb, $color);
  }

  // optional string midHash = 6;
  let $midHash = message.midHash;
  if ($midHash !== undefined) {
    writeVarint32(bb, 50);
    writeString(bb, $midHash);
  }

  // optional string content = 7;
  let $content = message.content;
  if ($content !== undefined) {
    writeVarint32(bb, 58);
    writeString(bb, $content);
  }

  // optional int64 ctime = 8;
  let $ctime = message.ctime;
  if ($ctime !== undefined) {
    writeVarint32(bb, 64);
    writeVarint64(bb, $ctime);
  }

  // optional int32 weight = 9;
  let $weight = message.weight;
  if ($weight !== undefined) {
    writeVarint32(bb, 72);
    writeVarint64(bb, intToLong($weight));
  }

  // optional string action = 10;
  let $action = message.action;
  if ($action !== undefined) {
    writeVarint32(bb, 82);
    writeString(bb, $action);
  }

  // optional int32 pool = 11;
  let $pool = message.pool;
  if ($pool !== undefined) {
    writeVarint32(bb, 88);
    writeVarint64(bb, intToLong($pool));
  }

  // optional string idStr = 12;
  let $idStr = message.idStr;
  if ($idStr !== undefined) {
    writeVarint32(bb, 98);
    writeString(bb, $idStr);
  }

  // optional int32 attr = 13;
  let $attr = message.attr;
  if ($attr !== undefined) {
    writeVarint32(bb, 104);
    writeVarint64(bb, intToLong($attr));
  }

  // optional string animation = 22;
  let $animation = message.animation;
  if ($animation !== undefined) {
    writeVarint32(bb, 178);
    writeString(bb, $animation);
  }

  // optional DmColorfulType colorful = 24;
  let $colorful = message.colorful;
  if ($colorful !== undefined) {
    writeVarint32(bb, 192);
    writeVarint32(bb, encodeDmColorfulType[$colorful]);
  }
}

export function decodeDanmakuElem(binary: Uint8Array): DanmakuElem {
  return _decodeDanmakuElem(wrapByteBuffer(binary));
}

function _decodeDanmakuElem(bb: ByteBuffer): DanmakuElem {
  let message: DanmakuElem = {} as any;

  end_of_message: while (!isAtEnd(bb)) {
    let tag = readVarint32(bb);

    switch (tag >>> 3) {
      case 0:
        break end_of_message;

      // optional int64 id = 1;
      case 1: {
        message.id = readVarint64(bb, /* unsigned */ false);
        break;
      }

      // optional int32 progress = 2;
      case 2: {
        message.progress = readVarint32(bb);
        break;
      }

      // optional int32 mode = 3;
      case 3: {
        message.mode = readVarint32(bb);
        break;
      }

      // optional int32 fontsize = 4;
      case 4: {
        message.fontsize = readVarint32(bb);
        break;
      }

      // optional uint32 color = 5;
      case 5: {
        message.color = readVarint32(bb) >>> 0;
        break;
      }

      // optional string midHash = 6;
      case 6: {
        message.midHash = readString(bb, readVarint32(bb));
        break;
      }

      // optional string content = 7;
      case 7: {
        message.content = readString(bb, readVarint32(bb));
        break;
      }

      // optional int64 ctime = 8;
      case 8: {
        message.ctime = readVarint64(bb, /* unsigned */ false);
        break;
      }

      // optional int32 weight = 9;
      case 9: {
        message.weight = readVarint32(bb);
        break;
      }

      // optional string action = 10;
      case 10: {
        message.action = readString(bb, readVarint32(bb));
        break;
      }

      // optional int32 pool = 11;
      case 11: {
        message.pool = readVarint32(bb);
        break;
      }

      // optional string idStr = 12;
      case 12: {
        message.idStr = readString(bb, readVarint32(bb));
        break;
      }

      // optional int32 attr = 13;
      case 13: {
        message.attr = readVarint32(bb);
        break;
      }

      // optional string animation = 22;
      case 22: {
        message.animation = readString(bb, readVarint32(bb));
        break;
      }

      // optional DmColorfulType colorful = 24;
      case 24: {
        message.colorful = decodeDmColorfulType[readVarint32(bb)];
        break;
      }

      default:
        skipUnknownField(bb, tag & 7);
    }
  }

  return message;
}

export interface DanmakuAIFlag {
  dm_flags?: DanmakuFlag[];
}

export function encodeDanmakuAIFlag(message: DanmakuAIFlag): Uint8Array {
  let bb = popByteBuffer();
  _encodeDanmakuAIFlag(message, bb);
  return toUint8Array(bb);
}

function _encodeDanmakuAIFlag(message: DanmakuAIFlag, bb: ByteBuffer): void {
  // repeated DanmakuFlag dm_flags = 1;
  let array$dm_flags = message.dm_flags;
  if (array$dm_flags !== undefined) {
    for (let value of array$dm_flags) {
      writeVarint32(bb, 10);
      let nested = popByteBuffer();
      _encodeDanmakuFlag(value, nested);
      writeVarint32(bb, nested.limit);
      writeByteBuffer(bb, nested);
      pushByteBuffer(nested);
    }
  }
}

export function decodeDanmakuAIFlag(binary: Uint8Array): DanmakuAIFlag {
  return _decodeDanmakuAIFlag(wrapByteBuffer(binary));
}

function _decodeDanmakuAIFlag(bb: ByteBuffer): DanmakuAIFlag {
  let message: DanmakuAIFlag = {} as any;

  end_of_message: while (!isAtEnd(bb)) {
    let tag = readVarint32(bb);

    switch (tag >>> 3) {
      case 0:
        break end_of_message;

      // repeated DanmakuFlag dm_flags = 1;
      case 1: {
        let limit = pushTemporaryLength(bb);
        let values = message.dm_flags || (message.dm_flags = []);
        values.push(_decodeDanmakuFlag(bb));
        bb.limit = limit;
        break;
      }

      default:
        skipUnknownField(bb, tag & 7);
    }
  }

  return message;
}

export interface DmColorful {
  type?: DmColorfulType;
  src?: string;
}

export function encodeDmColorful(message: DmColorful): Uint8Array {
  let bb = popByteBuffer();
  _encodeDmColorful(message, bb);
  return toUint8Array(bb);
}

function _encodeDmColorful(message: DmColorful, bb: ByteBuffer): void {
  // optional DmColorfulType type = 1;
  let $type = message.type;
  if ($type !== undefined) {
    writeVarint32(bb, 8);
    writeVarint32(bb, encodeDmColorfulType[$type]);
  }

  // optional string src = 2;
  let $src = message.src;
  if ($src !== undefined) {
    writeVarint32(bb, 18);
    writeString(bb, $src);
  }
}

export function decodeDmColorful(binary: Uint8Array): DmColorful {
  return _decodeDmColorful(wrapByteBuffer(binary));
}

function _decodeDmColorful(bb: ByteBuffer): DmColorful {
  let message: DmColorful = {} as any;

  end_of_message: while (!isAtEnd(bb)) {
    let tag = readVarint32(bb);

    switch (tag >>> 3) {
      case 0:
        break end_of_message;

      // optional DmColorfulType type = 1;
      case 1: {
        message.type = decodeDmColorfulType[readVarint32(bb)];
        break;
      }

      // optional string src = 2;
      case 2: {
        message.src = readString(bb, readVarint32(bb));
        break;
      }

      default:
        skipUnknownField(bb, tag & 7);
    }
  }

  return message;
}

export interface DanmakuFlag {
  dmid?: Long;
  flag?: number;
}

export function encodeDanmakuFlag(message: DanmakuFlag): Uint8Array {
  let bb = popByteBuffer();
  _encodeDanmakuFlag(message, bb);
  return toUint8Array(bb);
}

function _encodeDanmakuFlag(message: DanmakuFlag, bb: ByteBuffer): void {
  // optional int64 dmid = 1;
  let $dmid = message.dmid;
  if ($dmid !== undefined) {
    writeVarint32(bb, 8);
    writeVarint64(bb, $dmid);
  }

  // optional uint32 flag = 2;
  let $flag = message.flag;
  if ($flag !== undefined) {
    writeVarint32(bb, 16);
    writeVarint32(bb, $flag);
  }
}

export function decodeDanmakuFlag(binary: Uint8Array): DanmakuFlag {
  return _decodeDanmakuFlag(wrapByteBuffer(binary));
}

function _decodeDanmakuFlag(bb: ByteBuffer): DanmakuFlag {
  let message: DanmakuFlag = {} as any;

  end_of_message: while (!isAtEnd(bb)) {
    let tag = readVarint32(bb);

    switch (tag >>> 3) {
      case 0:
        break end_of_message;

      // optional int64 dmid = 1;
      case 1: {
        message.dmid = readVarint64(bb, /* unsigned */ false);
        break;
      }

      // optional uint32 flag = 2;
      case 2: {
        message.flag = readVarint32(bb) >>> 0;
        break;
      }

      default:
        skipUnknownField(bb, tag & 7);
    }
  }

  return message;
}

export interface Long {
  low: number;
  high: number;
  unsigned: boolean;
}

interface ByteBuffer {
  bytes: Uint8Array;
  offset: number;
  limit: number;
}

function pushTemporaryLength(bb: ByteBuffer): number {
  let length = readVarint32(bb);
  let limit = bb.limit;
  bb.limit = bb.offset + length;
  return limit;
}

function skipUnknownField(bb: ByteBuffer, type: number): void {
  switch (type) {
    case 0: while (readByte(bb) & 0x80) { } break;
    case 2: skip(bb, readVarint32(bb)); break;
    case 5: skip(bb, 4); break;
    case 1: skip(bb, 8); break;
    default: throw new Error("Unimplemented type: " + type);
  }
}

// The code below was modified from https://github.com/protobufjs/bytebuffer.js
// which is under the Apache License 2.0.

function intToLong(value: number): Long {
  value |= 0;
  return {
    low: value,
    high: value >> 31,
    unsigned: value >= 0,
  };
}

let bbStack: ByteBuffer[] = [];

function popByteBuffer(): ByteBuffer {
  const bb = bbStack.pop();
  if (!bb) return { bytes: new Uint8Array(64), offset: 0, limit: 0 };
  bb.offset = bb.limit = 0;
  return bb;
}

function pushByteBuffer(bb: ByteBuffer): void {
  bbStack.push(bb);
}

function wrapByteBuffer(bytes: Uint8Array): ByteBuffer {
  return { bytes, offset: 0, limit: bytes.length };
}

function toUint8Array(bb: ByteBuffer): Uint8Array {
  let bytes = bb.bytes;
  let limit = bb.limit;
  return bytes.length === limit ? bytes : bytes.subarray(0, limit);
}

function skip(bb: ByteBuffer, offset: number): void {
  if (bb.offset + offset > bb.limit) {
    throw new Error('Skip past limit');
  }
  bb.offset += offset;
}

function isAtEnd(bb: ByteBuffer): boolean {
  return bb.offset >= bb.limit;
}

function grow(bb: ByteBuffer, count: number): number {
  let bytes = bb.bytes;
  let offset = bb.offset;
  let limit = bb.limit;
  let finalOffset = offset + count;
  if (finalOffset > bytes.length) {
    let newBytes = new Uint8Array(finalOffset * 2);
    newBytes.set(bytes);
    bb.bytes = newBytes;
  }
  bb.offset = finalOffset;
  if (finalOffset > limit) {
    bb.limit = finalOffset;
  }
  return offset;
}

function advance(bb: ByteBuffer, count: number): number {
  let offset = bb.offset;
  if (offset + count > bb.limit) {
    throw new Error('Read past limit');
  }
  bb.offset += count;
  return offset;
}

function readString(bb: ByteBuffer, count: number): string {
  // Sadly a hand-coded UTF8 decoder is much faster than subarray+TextDecoder in V8
  let offset = advance(bb, count);
  let fromCharCode = String.fromCharCode;
  let bytes = bb.bytes;
  let invalid = '\uFFFD';
  let text = '';

  for (let i = 0; i < count; i++) {
    let c1 = bytes[i + offset], c2: number, c3: number, c4: number, c: number;

    // 1 byte
    if ((c1 & 0x80) === 0) {
      text += fromCharCode(c1);
    }

    // 2 bytes
    else if ((c1 & 0xE0) === 0xC0) {
      if (i + 1 >= count) text += invalid;
      else {
        c2 = bytes[i + offset + 1];
        if ((c2 & 0xC0) !== 0x80) text += invalid;
        else {
          c = ((c1 & 0x1F) << 6) | (c2 & 0x3F);
          if (c < 0x80) text += invalid;
          else {
            text += fromCharCode(c);
            i++;
          }
        }
      }
    }

    // 3 bytes
    else if ((c1 & 0xF0) == 0xE0) {
      if (i + 2 >= count) text += invalid;
      else {
        c2 = bytes[i + offset + 1];
        c3 = bytes[i + offset + 2];
        if (((c2 | (c3 << 8)) & 0xC0C0) !== 0x8080) text += invalid;
        else {
          c = ((c1 & 0x0F) << 12) | ((c2 & 0x3F) << 6) | (c3 & 0x3F);
          if (c < 0x0800 || (c >= 0xD800 && c <= 0xDFFF)) text += invalid;
          else {
            text += fromCharCode(c);
            i += 2;
          }
        }
      }
    }

    // 4 bytes
    else if ((c1 & 0xF8) == 0xF0) {
      if (i + 3 >= count) text += invalid;
      else {
        c2 = bytes[i + offset + 1];
        c3 = bytes[i + offset + 2];
        c4 = bytes[i + offset + 3];
        if (((c2 | (c3 << 8) | (c4 << 16)) & 0xC0C0C0) !== 0x808080) text += invalid;
        else {
          c = ((c1 & 0x07) << 0x12) | ((c2 & 0x3F) << 0x0C) | ((c3 & 0x3F) << 0x06) | (c4 & 0x3F);
          if (c < 0x10000 || c > 0x10FFFF) text += invalid;
          else {
            c -= 0x10000;
            text += fromCharCode((c >> 10) + 0xD800, (c & 0x3FF) + 0xDC00);
            i += 3;
          }
        }
      }
    }

    else text += invalid;
  }

  return text;
}

function writeString(bb: ByteBuffer, text: string): void {
  // Sadly a hand-coded UTF8 encoder is much faster than TextEncoder+set in V8
  let n = text.length;
  let byteCount = 0;

  // Write the byte count first
  for (let i = 0; i < n; i++) {
    let c = text.charCodeAt(i);
    if (c >= 0xD800 && c <= 0xDBFF && i + 1 < n) {
      c = (c << 10) + text.charCodeAt(++i) - 0x35FDC00;
    }
    byteCount += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }
  writeVarint32(bb, byteCount);

  let offset = grow(bb, byteCount);
  let bytes = bb.bytes;

  // Then write the bytes
  for (let i = 0; i < n; i++) {
    let c = text.charCodeAt(i);
    if (c >= 0xD800 && c <= 0xDBFF && i + 1 < n) {
      c = (c << 10) + text.charCodeAt(++i) - 0x35FDC00;
    }
    if (c < 0x80) {
      bytes[offset++] = c;
    } else {
      if (c < 0x800) {
        bytes[offset++] = ((c >> 6) & 0x1F) | 0xC0;
      } else {
        if (c < 0x10000) {
          bytes[offset++] = ((c >> 12) & 0x0F) | 0xE0;
        } else {
          bytes[offset++] = ((c >> 18) & 0x07) | 0xF0;
          bytes[offset++] = ((c >> 12) & 0x3F) | 0x80;
        }
        bytes[offset++] = ((c >> 6) & 0x3F) | 0x80;
      }
      bytes[offset++] = (c & 0x3F) | 0x80;
    }
  }
}

function writeByteBuffer(bb: ByteBuffer, buffer: ByteBuffer): void {
  let offset = grow(bb, buffer.limit);
  let from = bb.bytes;
  let to = buffer.bytes;

  // This for loop is much faster than subarray+set on V8
  for (let i = 0, n = buffer.limit; i < n; i++) {
    from[i + offset] = to[i];
  }
}

function readByte(bb: ByteBuffer): number {
  return bb.bytes[advance(bb, 1)];
}

function writeByte(bb: ByteBuffer, value: number): void {
  let offset = grow(bb, 1);
  bb.bytes[offset] = value;
}

function readVarint32(bb: ByteBuffer): number {
  let c = 0;
  let value = 0;
  let b: number;
  do {
    b = readByte(bb);
    if (c < 32) value |= (b & 0x7F) << c;
    c += 7;
  } while (b & 0x80);
  return value;
}

function writeVarint32(bb: ByteBuffer, value: number): void {
  value >>>= 0;
  while (value >= 0x80) {
    writeByte(bb, (value & 0x7f) | 0x80);
    value >>>= 7;
  }
  writeByte(bb, value);
}

function readVarint64(bb: ByteBuffer, unsigned: boolean): Long {
  let part0 = 0;
  let part1 = 0;
  let part2 = 0;
  let b: number;

  b = readByte(bb); part0 = (b & 0x7F); if (b & 0x80) {
    b = readByte(bb); part0 |= (b & 0x7F) << 7; if (b & 0x80) {
      b = readByte(bb); part0 |= (b & 0x7F) << 14; if (b & 0x80) {
        b = readByte(bb); part0 |= (b & 0x7F) << 21; if (b & 0x80) {

          b = readByte(bb); part1 = (b & 0x7F); if (b & 0x80) {
            b = readByte(bb); part1 |= (b & 0x7F) << 7; if (b & 0x80) {
              b = readByte(bb); part1 |= (b & 0x7F) << 14; if (b & 0x80) {
                b = readByte(bb); part1 |= (b & 0x7F) << 21; if (b & 0x80) {

                  b = readByte(bb); part2 = (b & 0x7F); if (b & 0x80) {
                    b = readByte(bb); part2 |= (b & 0x7F) << 7;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return {
    low: part0 | (part1 << 28),
    high: (part1 >>> 4) | (part2 << 24),
    unsigned,
  };
}

function writeVarint64(bb: ByteBuffer, value: Long): void {
  let part0 = value.low >>> 0;
  let part1 = ((value.low >>> 28) | (value.high << 4)) >>> 0;
  let part2 = value.high >>> 24;

  // ref: src/google/protobuf/io/coded_stream.cc
  let size =
    part2 === 0 ?
      part1 === 0 ?
        part0 < 1 << 14 ?
          part0 < 1 << 7 ? 1 : 2 :
          part0 < 1 << 21 ? 3 : 4 :
        part1 < 1 << 14 ?
          part1 < 1 << 7 ? 5 : 6 :
          part1 < 1 << 21 ? 7 : 8 :
      part2 < 1 << 7 ? 9 : 10;

  let offset = grow(bb, size);
  let bytes = bb.bytes;

  switch (size) {
    case 10: bytes[offset + 9] = (part2 >>> 7) & 0x01; break;
    case 9: bytes[offset + 8] = size !== 9 ? part2 | 0x80 : part2 & 0x7F; break;
    case 8: bytes[offset + 7] = size !== 8 ? (part1 >>> 21) | 0x80 : (part1 >>> 21) & 0x7F; break;
    case 7: bytes[offset + 6] = size !== 7 ? (part1 >>> 14) | 0x80 : (part1 >>> 14) & 0x7F; break;
    case 6: bytes[offset + 5] = size !== 6 ? (part1 >>> 7) | 0x80 : (part1 >>> 7) & 0x7F; break;
    case 5: bytes[offset + 4] = size !== 5 ? part1 | 0x80 : part1 & 0x7F; break;
    case 4: bytes[offset + 3] = size !== 4 ? (part0 >>> 21) | 0x80 : (part0 >>> 21) & 0x7F; break;
    case 3: bytes[offset + 2] = size !== 3 ? (part0 >>> 14) | 0x80 : (part0 >>> 14) & 0x7F; break;
    case 2: bytes[offset + 1] = size !== 2 ? (part0 >>> 7) | 0x80 : (part0 >>> 7) & 0x7F; break;
    case 1: bytes[offset] = size !== 1 ? part0 | 0x80 : part0 & 0x7F;
  }
}