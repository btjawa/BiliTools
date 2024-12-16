// Generated from https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/grpc_api/bilibili/community/service/dm/v1/dm.proto
/**
 * Convert DmSegMobileReply binary to readable XML.
 * @author https://github.com/btjawa
 * @license MIT
 */
export function DmSegMobileReplyToXML(binary) {
    const decoded = decodeDmSegMobileReply(binary);
    if (decoded?.elems) {
        const xmlDoc = new DOMParser().parseFromString('<?xml version="1.0" encoding="UTF-8"?><i></i>', "application/xml");
        const iElement = xmlDoc.querySelector("i");
        console.log(decoded.elems);
        decoded.elems.forEach(elem => {
            const dElement = xmlDoc.createElement("d");
            dElement.setAttribute("p", [
                (elem.progress || 0 / 1000).toString(),
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
    }
}
export const encodeAvatarType = {
    AvatarTypeNone: 0,
    AvatarTypeNFT: 1,
};
export const decodeAvatarType = {
    0: "AvatarTypeNone" /* AvatarType.AvatarTypeNone */,
    1: "AvatarTypeNFT" /* AvatarType.AvatarTypeNFT */,
};
export const encodeBubbleType = {
    BubbleTypeNone: 0,
    BubbleTypeClickButton: 1,
    BubbleTypeDmSettingPanel: 2,
};
export const decodeBubbleType = {
    0: "BubbleTypeNone" /* BubbleType.BubbleTypeNone */,
    1: "BubbleTypeClickButton" /* BubbleType.BubbleTypeClickButton */,
    2: "BubbleTypeDmSettingPanel" /* BubbleType.BubbleTypeDmSettingPanel */,
};
export const encodeCheckboxType = {
    CheckboxTypeNone: 0,
    CheckboxTypeEncourage: 1,
    CheckboxTypeColorDM: 2,
};
export const decodeCheckboxType = {
    0: "CheckboxTypeNone" /* CheckboxType.CheckboxTypeNone */,
    1: "CheckboxTypeEncourage" /* CheckboxType.CheckboxTypeEncourage */,
    2: "CheckboxTypeColorDM" /* CheckboxType.CheckboxTypeColorDM */,
};
export const encodeDMAttrBit = {
    DMAttrBitProtect: 0,
    DMAttrBitFromLive: 1,
    DMAttrHighLike: 2,
};
export const decodeDMAttrBit = {
    0: "DMAttrBitProtect" /* DMAttrBit.DMAttrBitProtect */,
    1: "DMAttrBitFromLive" /* DMAttrBit.DMAttrBitFromLive */,
    2: "DMAttrHighLike" /* DMAttrBit.DMAttrHighLike */,
};
export const encodeDmColorfulType = {
    NoneType: 0,
    VipGradualColor: 60001,
};
export const decodeDmColorfulType = {
    0: "NoneType" /* DmColorfulType.NoneType */,
    60001: "VipGradualColor" /* DmColorfulType.VipGradualColor */,
};
export const encodeExposureType = {
    ExposureTypeNone: 0,
    ExposureTypeDMSend: 1,
};
export const decodeExposureType = {
    0: "ExposureTypeNone" /* ExposureType.ExposureTypeNone */,
    1: "ExposureTypeDMSend" /* ExposureType.ExposureTypeDMSend */,
};
export const encodePostPanelBizType = {
    PostPanelBizTypeNone: 0,
    PostPanelBizTypeEncourage: 1,
    PostPanelBizTypeColorDM: 2,
    PostPanelBizTypeNFTDM: 3,
    PostPanelBizTypeFragClose: 4,
    PostPanelBizTypeRecommend: 5,
};
export const decodePostPanelBizType = {
    0: "PostPanelBizTypeNone" /* PostPanelBizType.PostPanelBizTypeNone */,
    1: "PostPanelBizTypeEncourage" /* PostPanelBizType.PostPanelBizTypeEncourage */,
    2: "PostPanelBizTypeColorDM" /* PostPanelBizType.PostPanelBizTypeColorDM */,
    3: "PostPanelBizTypeNFTDM" /* PostPanelBizType.PostPanelBizTypeNFTDM */,
    4: "PostPanelBizTypeFragClose" /* PostPanelBizType.PostPanelBizTypeFragClose */,
    5: "PostPanelBizTypeRecommend" /* PostPanelBizType.PostPanelBizTypeRecommend */,
};
export const encodePostStatus = {
    PostStatusNormal: 0,
    PostStatusClosed: 1,
};
export const decodePostStatus = {
    0: "PostStatusNormal" /* PostStatus.PostStatusNormal */,
    1: "PostStatusClosed" /* PostStatus.PostStatusClosed */,
};
export const encodeRenderType = {
    RenderTypeNone: 0,
    RenderTypeSingle: 1,
    RenderTypeRotation: 2,
};
export const decodeRenderType = {
    0: "RenderTypeNone" /* RenderType.RenderTypeNone */,
    1: "RenderTypeSingle" /* RenderType.RenderTypeSingle */,
    2: "RenderTypeRotation" /* RenderType.RenderTypeRotation */,
};
export const encodeSubtitleAiStatus = {
    None: 0,
    Exposure: 1,
    Assist: 2,
};
export const decodeSubtitleAiStatus = {
    0: "None" /* SubtitleAiStatus.None */,
    1: "Exposure" /* SubtitleAiStatus.Exposure */,
    2: "Assist" /* SubtitleAiStatus.Assist */,
};
export const encodeSubtitleAiType = {
    Normal: 0,
    Translate: 1,
};
export const decodeSubtitleAiType = {
    0: "Normal" /* SubtitleAiType.Normal */,
    1: "Translate" /* SubtitleAiType.Translate */,
};
export const encodeSubtitleType = {
    CC: 0,
    AI: 1,
};
export const decodeSubtitleType = {
    0: "CC" /* SubtitleType.CC */,
    1: "AI" /* SubtitleType.AI */,
};
export const encodeToastFunctionType = {
    ToastFunctionTypeNone: 0,
    ToastFunctionTypePostPanel: 1,
};
export const decodeToastFunctionType = {
    0: "ToastFunctionTypeNone" /* ToastFunctionType.ToastFunctionTypeNone */,
    1: "ToastFunctionTypePostPanel" /* ToastFunctionType.ToastFunctionTypePostPanel */,
};
export function encodeAvatar(message) {
    let bb = popByteBuffer();
    _encodeAvatar(message, bb);
    return toUint8Array(bb);
}
function _encodeAvatar(message, bb) {
    // optional string id = 1;
    let $id = message.id;
    if ($id !== undefined) {
        writeVarint32(bb, 10);
        writeString(bb, $id);
    }
    // optional string url = 2;
    let $url = message.url;
    if ($url !== undefined) {
        writeVarint32(bb, 18);
        writeString(bb, $url);
    }
    // optional AvatarType avatar_type = 3;
    let $avatar_type = message.avatar_type;
    if ($avatar_type !== undefined) {
        writeVarint32(bb, 24);
        writeVarint32(bb, encodeAvatarType[$avatar_type]);
    }
}
export function decodeAvatar(binary) {
    return _decodeAvatar(wrapByteBuffer(binary));
}
function _decodeAvatar(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional string id = 1;
            case 1: {
                message.id = readString(bb, readVarint32(bb));
                break;
            }
            // optional string url = 2;
            case 2: {
                message.url = readString(bb, readVarint32(bb));
                break;
            }
            // optional AvatarType avatar_type = 3;
            case 3: {
                message.avatar_type = decodeAvatarType[readVarint32(bb)];
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeBubble(message) {
    let bb = popByteBuffer();
    _encodeBubble(message, bb);
    return toUint8Array(bb);
}
function _encodeBubble(message, bb) {
    // optional string text = 1;
    let $text = message.text;
    if ($text !== undefined) {
        writeVarint32(bb, 10);
        writeString(bb, $text);
    }
    // optional string url = 2;
    let $url = message.url;
    if ($url !== undefined) {
        writeVarint32(bb, 18);
        writeString(bb, $url);
    }
}
export function decodeBubble(binary) {
    return _decodeBubble(wrapByteBuffer(binary));
}
function _decodeBubble(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional string text = 1;
            case 1: {
                message.text = readString(bb, readVarint32(bb));
                break;
            }
            // optional string url = 2;
            case 2: {
                message.url = readString(bb, readVarint32(bb));
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeBubbleV2(message) {
    let bb = popByteBuffer();
    _encodeBubbleV2(message, bb);
    return toUint8Array(bb);
}
function _encodeBubbleV2(message, bb) {
    // optional string text = 1;
    let $text = message.text;
    if ($text !== undefined) {
        writeVarint32(bb, 10);
        writeString(bb, $text);
    }
    // optional string url = 2;
    let $url = message.url;
    if ($url !== undefined) {
        writeVarint32(bb, 18);
        writeString(bb, $url);
    }
    // optional BubbleType bubble_type = 3;
    let $bubble_type = message.bubble_type;
    if ($bubble_type !== undefined) {
        writeVarint32(bb, 24);
        writeVarint32(bb, encodeBubbleType[$bubble_type]);
    }
    // optional bool exposure_once = 4;
    let $exposure_once = message.exposure_once;
    if ($exposure_once !== undefined) {
        writeVarint32(bb, 32);
        writeByte(bb, $exposure_once ? 1 : 0);
    }
    // optional ExposureType exposure_type = 5;
    let $exposure_type = message.exposure_type;
    if ($exposure_type !== undefined) {
        writeVarint32(bb, 40);
        writeVarint32(bb, encodeExposureType[$exposure_type]);
    }
}
export function decodeBubbleV2(binary) {
    return _decodeBubbleV2(wrapByteBuffer(binary));
}
function _decodeBubbleV2(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional string text = 1;
            case 1: {
                message.text = readString(bb, readVarint32(bb));
                break;
            }
            // optional string url = 2;
            case 2: {
                message.url = readString(bb, readVarint32(bb));
                break;
            }
            // optional BubbleType bubble_type = 3;
            case 3: {
                message.bubble_type = decodeBubbleType[readVarint32(bb)];
                break;
            }
            // optional bool exposure_once = 4;
            case 4: {
                message.exposure_once = !!readByte(bb);
                break;
            }
            // optional ExposureType exposure_type = 5;
            case 5: {
                message.exposure_type = decodeExposureType[readVarint32(bb)];
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeButton(message) {
    let bb = popByteBuffer();
    _encodeButton(message, bb);
    return toUint8Array(bb);
}
function _encodeButton(message, bb) {
    // optional string text = 1;
    let $text = message.text;
    if ($text !== undefined) {
        writeVarint32(bb, 10);
        writeString(bb, $text);
    }
    // optional int32 action = 2;
    let $action = message.action;
    if ($action !== undefined) {
        writeVarint32(bb, 16);
        writeVarint64(bb, intToLong($action));
    }
}
export function decodeButton(binary) {
    return _decodeButton(wrapByteBuffer(binary));
}
function _decodeButton(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional string text = 1;
            case 1: {
                message.text = readString(bb, readVarint32(bb));
                break;
            }
            // optional int32 action = 2;
            case 2: {
                message.action = readVarint32(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeBuzzwordConfig(message) {
    let bb = popByteBuffer();
    _encodeBuzzwordConfig(message, bb);
    return toUint8Array(bb);
}
function _encodeBuzzwordConfig(message, bb) {
    // repeated BuzzwordShowConfig keywords = 1;
    let array$keywords = message.keywords;
    if (array$keywords !== undefined) {
        for (let value of array$keywords) {
            writeVarint32(bb, 10);
            let nested = popByteBuffer();
            _encodeBuzzwordShowConfig(value, nested);
            writeVarint32(bb, nested.limit);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
}
export function decodeBuzzwordConfig(binary) {
    return _decodeBuzzwordConfig(wrapByteBuffer(binary));
}
function _decodeBuzzwordConfig(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // repeated BuzzwordShowConfig keywords = 1;
            case 1: {
                let limit = pushTemporaryLength(bb);
                let values = message.keywords || (message.keywords = []);
                values.push(_decodeBuzzwordShowConfig(bb));
                bb.limit = limit;
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeBuzzwordShowConfig(message) {
    let bb = popByteBuffer();
    _encodeBuzzwordShowConfig(message, bb);
    return toUint8Array(bb);
}
function _encodeBuzzwordShowConfig(message, bb) {
    // optional string name = 1;
    let $name = message.name;
    if ($name !== undefined) {
        writeVarint32(bb, 10);
        writeString(bb, $name);
    }
    // optional string schema = 2;
    let $schema = message.schema;
    if ($schema !== undefined) {
        writeVarint32(bb, 18);
        writeString(bb, $schema);
    }
    // optional int32 source = 3;
    let $source = message.source;
    if ($source !== undefined) {
        writeVarint32(bb, 24);
        writeVarint64(bb, intToLong($source));
    }
    // optional int64 id = 4;
    let $id = message.id;
    if ($id !== undefined) {
        writeVarint32(bb, 32);
        writeVarint64(bb, $id);
    }
    // optional int64 buzzword_id = 5;
    let $buzzword_id = message.buzzword_id;
    if ($buzzword_id !== undefined) {
        writeVarint32(bb, 40);
        writeVarint64(bb, $buzzword_id);
    }
    // optional int32 schema_type = 6;
    let $schema_type = message.schema_type;
    if ($schema_type !== undefined) {
        writeVarint32(bb, 48);
        writeVarint64(bb, intToLong($schema_type));
    }
}
export function decodeBuzzwordShowConfig(binary) {
    return _decodeBuzzwordShowConfig(wrapByteBuffer(binary));
}
function _decodeBuzzwordShowConfig(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional string name = 1;
            case 1: {
                message.name = readString(bb, readVarint32(bb));
                break;
            }
            // optional string schema = 2;
            case 2: {
                message.schema = readString(bb, readVarint32(bb));
                break;
            }
            // optional int32 source = 3;
            case 3: {
                message.source = readVarint32(bb);
                break;
            }
            // optional int64 id = 4;
            case 4: {
                message.id = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int64 buzzword_id = 5;
            case 5: {
                message.buzzword_id = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int32 schema_type = 6;
            case 6: {
                message.schema_type = readVarint32(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeCheckBox(message) {
    let bb = popByteBuffer();
    _encodeCheckBox(message, bb);
    return toUint8Array(bb);
}
function _encodeCheckBox(message, bb) {
    // optional string text = 1;
    let $text = message.text;
    if ($text !== undefined) {
        writeVarint32(bb, 10);
        writeString(bb, $text);
    }
    // optional CheckboxType type = 2;
    let $type = message.type;
    if ($type !== undefined) {
        writeVarint32(bb, 16);
        writeVarint32(bb, encodeCheckboxType[$type]);
    }
    // optional bool default_value = 3;
    let $default_value = message.default_value;
    if ($default_value !== undefined) {
        writeVarint32(bb, 24);
        writeByte(bb, $default_value ? 1 : 0);
    }
    // optional bool show = 4;
    let $show = message.show;
    if ($show !== undefined) {
        writeVarint32(bb, 32);
        writeByte(bb, $show ? 1 : 0);
    }
}
export function decodeCheckBox(binary) {
    return _decodeCheckBox(wrapByteBuffer(binary));
}
function _decodeCheckBox(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional string text = 1;
            case 1: {
                message.text = readString(bb, readVarint32(bb));
                break;
            }
            // optional CheckboxType type = 2;
            case 2: {
                message.type = decodeCheckboxType[readVarint32(bb)];
                break;
            }
            // optional bool default_value = 3;
            case 3: {
                message.default_value = !!readByte(bb);
                break;
            }
            // optional bool show = 4;
            case 4: {
                message.show = !!readByte(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeCheckBoxV2(message) {
    let bb = popByteBuffer();
    _encodeCheckBoxV2(message, bb);
    return toUint8Array(bb);
}
function _encodeCheckBoxV2(message, bb) {
    // optional string text = 1;
    let $text = message.text;
    if ($text !== undefined) {
        writeVarint32(bb, 10);
        writeString(bb, $text);
    }
    // optional int32 type = 2;
    let $type = message.type;
    if ($type !== undefined) {
        writeVarint32(bb, 16);
        writeVarint64(bb, intToLong($type));
    }
    // optional bool default_value = 3;
    let $default_value = message.default_value;
    if ($default_value !== undefined) {
        writeVarint32(bb, 24);
        writeByte(bb, $default_value ? 1 : 0);
    }
}
export function decodeCheckBoxV2(binary) {
    return _decodeCheckBoxV2(wrapByteBuffer(binary));
}
function _decodeCheckBoxV2(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional string text = 1;
            case 1: {
                message.text = readString(bb, readVarint32(bb));
                break;
            }
            // optional int32 type = 2;
            case 2: {
                message.type = readVarint32(bb);
                break;
            }
            // optional bool default_value = 3;
            case 3: {
                message.default_value = !!readByte(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeClickButton(message) {
    let bb = popByteBuffer();
    _encodeClickButton(message, bb);
    return toUint8Array(bb);
}
function _encodeClickButton(message, bb) {
    // repeated string portrait_text = 1;
    let array$portrait_text = message.portrait_text;
    if (array$portrait_text !== undefined) {
        for (let value of array$portrait_text) {
            writeVarint32(bb, 10);
            writeString(bb, value);
        }
    }
    // repeated string landscape_text = 2;
    let array$landscape_text = message.landscape_text;
    if (array$landscape_text !== undefined) {
        for (let value of array$landscape_text) {
            writeVarint32(bb, 18);
            writeString(bb, value);
        }
    }
    // repeated string portrait_text_focus = 3;
    let array$portrait_text_focus = message.portrait_text_focus;
    if (array$portrait_text_focus !== undefined) {
        for (let value of array$portrait_text_focus) {
            writeVarint32(bb, 26);
            writeString(bb, value);
        }
    }
    // repeated string landscape_text_focus = 4;
    let array$landscape_text_focus = message.landscape_text_focus;
    if (array$landscape_text_focus !== undefined) {
        for (let value of array$landscape_text_focus) {
            writeVarint32(bb, 34);
            writeString(bb, value);
        }
    }
    // optional RenderType render_type = 5;
    let $render_type = message.render_type;
    if ($render_type !== undefined) {
        writeVarint32(bb, 40);
        writeVarint32(bb, encodeRenderType[$render_type]);
    }
    // optional bool show = 6;
    let $show = message.show;
    if ($show !== undefined) {
        writeVarint32(bb, 48);
        writeByte(bb, $show ? 1 : 0);
    }
    // optional Bubble bubble = 7;
    let $bubble = message.bubble;
    if ($bubble !== undefined) {
        writeVarint32(bb, 58);
        let nested = popByteBuffer();
        _encodeBubble($bubble, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
}
export function decodeClickButton(binary) {
    return _decodeClickButton(wrapByteBuffer(binary));
}
function _decodeClickButton(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // repeated string portrait_text = 1;
            case 1: {
                let values = message.portrait_text || (message.portrait_text = []);
                values.push(readString(bb, readVarint32(bb)));
                break;
            }
            // repeated string landscape_text = 2;
            case 2: {
                let values = message.landscape_text || (message.landscape_text = []);
                values.push(readString(bb, readVarint32(bb)));
                break;
            }
            // repeated string portrait_text_focus = 3;
            case 3: {
                let values = message.portrait_text_focus || (message.portrait_text_focus = []);
                values.push(readString(bb, readVarint32(bb)));
                break;
            }
            // repeated string landscape_text_focus = 4;
            case 4: {
                let values = message.landscape_text_focus || (message.landscape_text_focus = []);
                values.push(readString(bb, readVarint32(bb)));
                break;
            }
            // optional RenderType render_type = 5;
            case 5: {
                message.render_type = decodeRenderType[readVarint32(bb)];
                break;
            }
            // optional bool show = 6;
            case 6: {
                message.show = !!readByte(bb);
                break;
            }
            // optional Bubble bubble = 7;
            case 7: {
                let limit = pushTemporaryLength(bb);
                message.bubble = _decodeBubble(bb);
                bb.limit = limit;
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeClickButtonV2(message) {
    let bb = popByteBuffer();
    _encodeClickButtonV2(message, bb);
    return toUint8Array(bb);
}
function _encodeClickButtonV2(message, bb) {
    // repeated string portrait_text = 1;
    let array$portrait_text = message.portrait_text;
    if (array$portrait_text !== undefined) {
        for (let value of array$portrait_text) {
            writeVarint32(bb, 10);
            writeString(bb, value);
        }
    }
    // repeated string landscape_text = 2;
    let array$landscape_text = message.landscape_text;
    if (array$landscape_text !== undefined) {
        for (let value of array$landscape_text) {
            writeVarint32(bb, 18);
            writeString(bb, value);
        }
    }
    // repeated string portrait_text_focus = 3;
    let array$portrait_text_focus = message.portrait_text_focus;
    if (array$portrait_text_focus !== undefined) {
        for (let value of array$portrait_text_focus) {
            writeVarint32(bb, 26);
            writeString(bb, value);
        }
    }
    // repeated string landscape_text_focus = 4;
    let array$landscape_text_focus = message.landscape_text_focus;
    if (array$landscape_text_focus !== undefined) {
        for (let value of array$landscape_text_focus) {
            writeVarint32(bb, 34);
            writeString(bb, value);
        }
    }
    // optional int32 render_type = 5;
    let $render_type = message.render_type;
    if ($render_type !== undefined) {
        writeVarint32(bb, 40);
        writeVarint64(bb, intToLong($render_type));
    }
    // optional bool text_input_post = 6;
    let $text_input_post = message.text_input_post;
    if ($text_input_post !== undefined) {
        writeVarint32(bb, 48);
        writeByte(bb, $text_input_post ? 1 : 0);
    }
    // optional bool exposure_once = 7;
    let $exposure_once = message.exposure_once;
    if ($exposure_once !== undefined) {
        writeVarint32(bb, 56);
        writeByte(bb, $exposure_once ? 1 : 0);
    }
    // optional int32 exposure_type = 8;
    let $exposure_type = message.exposure_type;
    if ($exposure_type !== undefined) {
        writeVarint32(bb, 64);
        writeVarint64(bb, intToLong($exposure_type));
    }
}
export function decodeClickButtonV2(binary) {
    return _decodeClickButtonV2(wrapByteBuffer(binary));
}
function _decodeClickButtonV2(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // repeated string portrait_text = 1;
            case 1: {
                let values = message.portrait_text || (message.portrait_text = []);
                values.push(readString(bb, readVarint32(bb)));
                break;
            }
            // repeated string landscape_text = 2;
            case 2: {
                let values = message.landscape_text || (message.landscape_text = []);
                values.push(readString(bb, readVarint32(bb)));
                break;
            }
            // repeated string portrait_text_focus = 3;
            case 3: {
                let values = message.portrait_text_focus || (message.portrait_text_focus = []);
                values.push(readString(bb, readVarint32(bb)));
                break;
            }
            // repeated string landscape_text_focus = 4;
            case 4: {
                let values = message.landscape_text_focus || (message.landscape_text_focus = []);
                values.push(readString(bb, readVarint32(bb)));
                break;
            }
            // optional int32 render_type = 5;
            case 5: {
                message.render_type = readVarint32(bb);
                break;
            }
            // optional bool text_input_post = 6;
            case 6: {
                message.text_input_post = !!readByte(bb);
                break;
            }
            // optional bool exposure_once = 7;
            case 7: {
                message.exposure_once = !!readByte(bb);
                break;
            }
            // optional int32 exposure_type = 8;
            case 8: {
                message.exposure_type = readVarint32(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeCommandDm(message) {
    let bb = popByteBuffer();
    _encodeCommandDm(message, bb);
    return toUint8Array(bb);
}
function _encodeCommandDm(message, bb) {
    // optional int64 id = 1;
    let $id = message.id;
    if ($id !== undefined) {
        writeVarint32(bb, 8);
        writeVarint64(bb, $id);
    }
    // optional int64 oid = 2;
    let $oid = message.oid;
    if ($oid !== undefined) {
        writeVarint32(bb, 16);
        writeVarint64(bb, $oid);
    }
    // optional string mid = 3;
    let $mid = message.mid;
    if ($mid !== undefined) {
        writeVarint32(bb, 26);
        writeString(bb, $mid);
    }
    // optional string command = 4;
    let $command = message.command;
    if ($command !== undefined) {
        writeVarint32(bb, 34);
        writeString(bb, $command);
    }
    // optional string content = 5;
    let $content = message.content;
    if ($content !== undefined) {
        writeVarint32(bb, 42);
        writeString(bb, $content);
    }
    // optional int32 progress = 6;
    let $progress = message.progress;
    if ($progress !== undefined) {
        writeVarint32(bb, 48);
        writeVarint64(bb, intToLong($progress));
    }
    // optional string ctime = 7;
    let $ctime = message.ctime;
    if ($ctime !== undefined) {
        writeVarint32(bb, 58);
        writeString(bb, $ctime);
    }
    // optional string mtime = 8;
    let $mtime = message.mtime;
    if ($mtime !== undefined) {
        writeVarint32(bb, 66);
        writeString(bb, $mtime);
    }
    // optional string extra = 9;
    let $extra = message.extra;
    if ($extra !== undefined) {
        writeVarint32(bb, 74);
        writeString(bb, $extra);
    }
    // optional string idStr = 10;
    let $idStr = message.idStr;
    if ($idStr !== undefined) {
        writeVarint32(bb, 82);
        writeString(bb, $idStr);
    }
}
export function decodeCommandDm(binary) {
    return _decodeCommandDm(wrapByteBuffer(binary));
}
function _decodeCommandDm(bb) {
    let message = {};
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
            // optional int64 oid = 2;
            case 2: {
                message.oid = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional string mid = 3;
            case 3: {
                message.mid = readString(bb, readVarint32(bb));
                break;
            }
            // optional string command = 4;
            case 4: {
                message.command = readString(bb, readVarint32(bb));
                break;
            }
            // optional string content = 5;
            case 5: {
                message.content = readString(bb, readVarint32(bb));
                break;
            }
            // optional int32 progress = 6;
            case 6: {
                message.progress = readVarint32(bb);
                break;
            }
            // optional string ctime = 7;
            case 7: {
                message.ctime = readString(bb, readVarint32(bb));
                break;
            }
            // optional string mtime = 8;
            case 8: {
                message.mtime = readString(bb, readVarint32(bb));
                break;
            }
            // optional string extra = 9;
            case 9: {
                message.extra = readString(bb, readVarint32(bb));
                break;
            }
            // optional string idStr = 10;
            case 10: {
                message.idStr = readString(bb, readVarint32(bb));
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeDanmakuAIFlag(message) {
    let bb = popByteBuffer();
    _encodeDanmakuAIFlag(message, bb);
    return toUint8Array(bb);
}
function _encodeDanmakuAIFlag(message, bb) {
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
export function decodeDanmakuAIFlag(binary) {
    return _decodeDanmakuAIFlag(wrapByteBuffer(binary));
}
function _decodeDanmakuAIFlag(bb) {
    let message = {};
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
export function encodeDanmakuElem(message) {
    let bb = popByteBuffer();
    _encodeDanmakuElem(message, bb);
    return toUint8Array(bb);
}
function _encodeDanmakuElem(message, bb) {
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
export function decodeDanmakuElem(binary) {
    return _decodeDanmakuElem(wrapByteBuffer(binary));
}
function _decodeDanmakuElem(bb) {
    let message = {};
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
export function encodeDanmakuFlag(message) {
    let bb = popByteBuffer();
    _encodeDanmakuFlag(message, bb);
    return toUint8Array(bb);
}
function _encodeDanmakuFlag(message, bb) {
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
export function decodeDanmakuFlag(binary) {
    return _decodeDanmakuFlag(wrapByteBuffer(binary));
}
function _decodeDanmakuFlag(bb) {
    let message = {};
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
export function encodeDanmakuFlagConfig(message) {
    let bb = popByteBuffer();
    _encodeDanmakuFlagConfig(message, bb);
    return toUint8Array(bb);
}
function _encodeDanmakuFlagConfig(message, bb) {
    // optional int32 rec_flag = 1;
    let $rec_flag = message.rec_flag;
    if ($rec_flag !== undefined) {
        writeVarint32(bb, 8);
        writeVarint64(bb, intToLong($rec_flag));
    }
    // optional string rec_text = 2;
    let $rec_text = message.rec_text;
    if ($rec_text !== undefined) {
        writeVarint32(bb, 18);
        writeString(bb, $rec_text);
    }
    // optional int32 rec_switch = 3;
    let $rec_switch = message.rec_switch;
    if ($rec_switch !== undefined) {
        writeVarint32(bb, 24);
        writeVarint64(bb, intToLong($rec_switch));
    }
}
export function decodeDanmakuFlagConfig(binary) {
    return _decodeDanmakuFlagConfig(wrapByteBuffer(binary));
}
function _decodeDanmakuFlagConfig(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional int32 rec_flag = 1;
            case 1: {
                message.rec_flag = readVarint32(bb);
                break;
            }
            // optional string rec_text = 2;
            case 2: {
                message.rec_text = readString(bb, readVarint32(bb));
                break;
            }
            // optional int32 rec_switch = 3;
            case 3: {
                message.rec_switch = readVarint32(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeDanmuDefaultPlayerConfig(message) {
    let bb = popByteBuffer();
    _encodeDanmuDefaultPlayerConfig(message, bb);
    return toUint8Array(bb);
}
function _encodeDanmuDefaultPlayerConfig(message, bb) {
    // optional bool player_danmaku_use_default_config = 1;
    let $player_danmaku_use_default_config = message.player_danmaku_use_default_config;
    if ($player_danmaku_use_default_config !== undefined) {
        writeVarint32(bb, 8);
        writeByte(bb, $player_danmaku_use_default_config ? 1 : 0);
    }
    // optional bool player_danmaku_ai_recommended_switch = 4;
    let $player_danmaku_ai_recommended_switch = message.player_danmaku_ai_recommended_switch;
    if ($player_danmaku_ai_recommended_switch !== undefined) {
        writeVarint32(bb, 32);
        writeByte(bb, $player_danmaku_ai_recommended_switch ? 1 : 0);
    }
    // optional int32 player_danmaku_ai_recommended_level = 5;
    let $player_danmaku_ai_recommended_level = message.player_danmaku_ai_recommended_level;
    if ($player_danmaku_ai_recommended_level !== undefined) {
        writeVarint32(bb, 40);
        writeVarint64(bb, intToLong($player_danmaku_ai_recommended_level));
    }
    // optional bool player_danmaku_blocktop = 6;
    let $player_danmaku_blocktop = message.player_danmaku_blocktop;
    if ($player_danmaku_blocktop !== undefined) {
        writeVarint32(bb, 48);
        writeByte(bb, $player_danmaku_blocktop ? 1 : 0);
    }
    // optional bool player_danmaku_blockscroll = 7;
    let $player_danmaku_blockscroll = message.player_danmaku_blockscroll;
    if ($player_danmaku_blockscroll !== undefined) {
        writeVarint32(bb, 56);
        writeByte(bb, $player_danmaku_blockscroll ? 1 : 0);
    }
    // optional bool player_danmaku_blockbottom = 8;
    let $player_danmaku_blockbottom = message.player_danmaku_blockbottom;
    if ($player_danmaku_blockbottom !== undefined) {
        writeVarint32(bb, 64);
        writeByte(bb, $player_danmaku_blockbottom ? 1 : 0);
    }
    // optional bool player_danmaku_blockcolorful = 9;
    let $player_danmaku_blockcolorful = message.player_danmaku_blockcolorful;
    if ($player_danmaku_blockcolorful !== undefined) {
        writeVarint32(bb, 72);
        writeByte(bb, $player_danmaku_blockcolorful ? 1 : 0);
    }
    // optional bool player_danmaku_blockrepeat = 10;
    let $player_danmaku_blockrepeat = message.player_danmaku_blockrepeat;
    if ($player_danmaku_blockrepeat !== undefined) {
        writeVarint32(bb, 80);
        writeByte(bb, $player_danmaku_blockrepeat ? 1 : 0);
    }
    // optional bool player_danmaku_blockspecial = 11;
    let $player_danmaku_blockspecial = message.player_danmaku_blockspecial;
    if ($player_danmaku_blockspecial !== undefined) {
        writeVarint32(bb, 88);
        writeByte(bb, $player_danmaku_blockspecial ? 1 : 0);
    }
    // optional float player_danmaku_opacity = 12;
    let $player_danmaku_opacity = message.player_danmaku_opacity;
    if ($player_danmaku_opacity !== undefined) {
        writeVarint32(bb, 101);
        writeFloat(bb, $player_danmaku_opacity);
    }
    // optional float player_danmaku_scalingfactor = 13;
    let $player_danmaku_scalingfactor = message.player_danmaku_scalingfactor;
    if ($player_danmaku_scalingfactor !== undefined) {
        writeVarint32(bb, 109);
        writeFloat(bb, $player_danmaku_scalingfactor);
    }
    // optional float player_danmaku_domain = 14;
    let $player_danmaku_domain = message.player_danmaku_domain;
    if ($player_danmaku_domain !== undefined) {
        writeVarint32(bb, 117);
        writeFloat(bb, $player_danmaku_domain);
    }
    // optional int32 player_danmaku_speed = 15;
    let $player_danmaku_speed = message.player_danmaku_speed;
    if ($player_danmaku_speed !== undefined) {
        writeVarint32(bb, 120);
        writeVarint64(bb, intToLong($player_danmaku_speed));
    }
    // optional bool inline_player_danmaku_switch = 16;
    let $inline_player_danmaku_switch = message.inline_player_danmaku_switch;
    if ($inline_player_danmaku_switch !== undefined) {
        writeVarint32(bb, 128);
        writeByte(bb, $inline_player_danmaku_switch ? 1 : 0);
    }
    // optional int32 player_danmaku_senior_mode_switch = 17;
    let $player_danmaku_senior_mode_switch = message.player_danmaku_senior_mode_switch;
    if ($player_danmaku_senior_mode_switch !== undefined) {
        writeVarint32(bb, 136);
        writeVarint64(bb, intToLong($player_danmaku_senior_mode_switch));
    }
    // optional int32 player_danmaku_ai_recommended_level_v2 = 18;
    let $player_danmaku_ai_recommended_level_v2 = message.player_danmaku_ai_recommended_level_v2;
    if ($player_danmaku_ai_recommended_level_v2 !== undefined) {
        writeVarint32(bb, 144);
        writeVarint64(bb, intToLong($player_danmaku_ai_recommended_level_v2));
    }
    // optional map<int32, int32> player_danmaku_ai_recommended_level_v2_map = 19;
    let map$player_danmaku_ai_recommended_level_v2_map = message.player_danmaku_ai_recommended_level_v2_map;
    if (map$player_danmaku_ai_recommended_level_v2_map !== undefined) {
        for (let key in map$player_danmaku_ai_recommended_level_v2_map) {
            let nested = popByteBuffer();
            let value = map$player_danmaku_ai_recommended_level_v2_map[key];
            writeVarint32(nested, 8);
            writeVarint64(nested, intToLong(+key));
            writeVarint32(nested, 16);
            writeVarint64(nested, intToLong(value));
            writeVarint32(bb, 154);
            writeVarint32(bb, nested.offset);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
}
export function decodeDanmuDefaultPlayerConfig(binary) {
    return _decodeDanmuDefaultPlayerConfig(wrapByteBuffer(binary));
}
function _decodeDanmuDefaultPlayerConfig(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional bool player_danmaku_use_default_config = 1;
            case 1: {
                message.player_danmaku_use_default_config = !!readByte(bb);
                break;
            }
            // optional bool player_danmaku_ai_recommended_switch = 4;
            case 4: {
                message.player_danmaku_ai_recommended_switch = !!readByte(bb);
                break;
            }
            // optional int32 player_danmaku_ai_recommended_level = 5;
            case 5: {
                message.player_danmaku_ai_recommended_level = readVarint32(bb);
                break;
            }
            // optional bool player_danmaku_blocktop = 6;
            case 6: {
                message.player_danmaku_blocktop = !!readByte(bb);
                break;
            }
            // optional bool player_danmaku_blockscroll = 7;
            case 7: {
                message.player_danmaku_blockscroll = !!readByte(bb);
                break;
            }
            // optional bool player_danmaku_blockbottom = 8;
            case 8: {
                message.player_danmaku_blockbottom = !!readByte(bb);
                break;
            }
            // optional bool player_danmaku_blockcolorful = 9;
            case 9: {
                message.player_danmaku_blockcolorful = !!readByte(bb);
                break;
            }
            // optional bool player_danmaku_blockrepeat = 10;
            case 10: {
                message.player_danmaku_blockrepeat = !!readByte(bb);
                break;
            }
            // optional bool player_danmaku_blockspecial = 11;
            case 11: {
                message.player_danmaku_blockspecial = !!readByte(bb);
                break;
            }
            // optional float player_danmaku_opacity = 12;
            case 12: {
                message.player_danmaku_opacity = readFloat(bb);
                break;
            }
            // optional float player_danmaku_scalingfactor = 13;
            case 13: {
                message.player_danmaku_scalingfactor = readFloat(bb);
                break;
            }
            // optional float player_danmaku_domain = 14;
            case 14: {
                message.player_danmaku_domain = readFloat(bb);
                break;
            }
            // optional int32 player_danmaku_speed = 15;
            case 15: {
                message.player_danmaku_speed = readVarint32(bb);
                break;
            }
            // optional bool inline_player_danmaku_switch = 16;
            case 16: {
                message.inline_player_danmaku_switch = !!readByte(bb);
                break;
            }
            // optional int32 player_danmaku_senior_mode_switch = 17;
            case 17: {
                message.player_danmaku_senior_mode_switch = readVarint32(bb);
                break;
            }
            // optional int32 player_danmaku_ai_recommended_level_v2 = 18;
            case 18: {
                message.player_danmaku_ai_recommended_level_v2 = readVarint32(bb);
                break;
            }
            // optional map<int32, int32> player_danmaku_ai_recommended_level_v2_map = 19;
            case 19: {
                let values = message.player_danmaku_ai_recommended_level_v2_map || (message.player_danmaku_ai_recommended_level_v2_map = {});
                let outerLimit = pushTemporaryLength(bb);
                let key;
                let value;
                end_of_entry: while (!isAtEnd(bb)) {
                    let tag = readVarint32(bb);
                    switch (tag >>> 3) {
                        case 0:
                            break end_of_entry;
                        case 1: {
                            key = readVarint32(bb);
                            break;
                        }
                        case 2: {
                            value = readVarint32(bb);
                            break;
                        }
                        default:
                            skipUnknownField(bb, tag & 7);
                    }
                }
                if (key === undefined || value === undefined)
                    throw new Error("Invalid data for map: player_danmaku_ai_recommended_level_v2_map");
                values[key] = value;
                bb.limit = outerLimit;
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeDanmuPlayerConfig(message) {
    let bb = popByteBuffer();
    _encodeDanmuPlayerConfig(message, bb);
    return toUint8Array(bb);
}
function _encodeDanmuPlayerConfig(message, bb) {
    // optional bool player_danmaku_switch = 1;
    let $player_danmaku_switch = message.player_danmaku_switch;
    if ($player_danmaku_switch !== undefined) {
        writeVarint32(bb, 8);
        writeByte(bb, $player_danmaku_switch ? 1 : 0);
    }
    // optional bool player_danmaku_switch_save = 2;
    let $player_danmaku_switch_save = message.player_danmaku_switch_save;
    if ($player_danmaku_switch_save !== undefined) {
        writeVarint32(bb, 16);
        writeByte(bb, $player_danmaku_switch_save ? 1 : 0);
    }
    // optional bool player_danmaku_use_default_config = 3;
    let $player_danmaku_use_default_config = message.player_danmaku_use_default_config;
    if ($player_danmaku_use_default_config !== undefined) {
        writeVarint32(bb, 24);
        writeByte(bb, $player_danmaku_use_default_config ? 1 : 0);
    }
    // optional bool player_danmaku_ai_recommended_switch = 4;
    let $player_danmaku_ai_recommended_switch = message.player_danmaku_ai_recommended_switch;
    if ($player_danmaku_ai_recommended_switch !== undefined) {
        writeVarint32(bb, 32);
        writeByte(bb, $player_danmaku_ai_recommended_switch ? 1 : 0);
    }
    // optional int32 player_danmaku_ai_recommended_level = 5;
    let $player_danmaku_ai_recommended_level = message.player_danmaku_ai_recommended_level;
    if ($player_danmaku_ai_recommended_level !== undefined) {
        writeVarint32(bb, 40);
        writeVarint64(bb, intToLong($player_danmaku_ai_recommended_level));
    }
    // optional bool player_danmaku_blocktop = 6;
    let $player_danmaku_blocktop = message.player_danmaku_blocktop;
    if ($player_danmaku_blocktop !== undefined) {
        writeVarint32(bb, 48);
        writeByte(bb, $player_danmaku_blocktop ? 1 : 0);
    }
    // optional bool player_danmaku_blockscroll = 7;
    let $player_danmaku_blockscroll = message.player_danmaku_blockscroll;
    if ($player_danmaku_blockscroll !== undefined) {
        writeVarint32(bb, 56);
        writeByte(bb, $player_danmaku_blockscroll ? 1 : 0);
    }
    // optional bool player_danmaku_blockbottom = 8;
    let $player_danmaku_blockbottom = message.player_danmaku_blockbottom;
    if ($player_danmaku_blockbottom !== undefined) {
        writeVarint32(bb, 64);
        writeByte(bb, $player_danmaku_blockbottom ? 1 : 0);
    }
    // optional bool player_danmaku_blockcolorful = 9;
    let $player_danmaku_blockcolorful = message.player_danmaku_blockcolorful;
    if ($player_danmaku_blockcolorful !== undefined) {
        writeVarint32(bb, 72);
        writeByte(bb, $player_danmaku_blockcolorful ? 1 : 0);
    }
    // optional bool player_danmaku_blockrepeat = 10;
    let $player_danmaku_blockrepeat = message.player_danmaku_blockrepeat;
    if ($player_danmaku_blockrepeat !== undefined) {
        writeVarint32(bb, 80);
        writeByte(bb, $player_danmaku_blockrepeat ? 1 : 0);
    }
    // optional bool player_danmaku_blockspecial = 11;
    let $player_danmaku_blockspecial = message.player_danmaku_blockspecial;
    if ($player_danmaku_blockspecial !== undefined) {
        writeVarint32(bb, 88);
        writeByte(bb, $player_danmaku_blockspecial ? 1 : 0);
    }
    // optional float player_danmaku_opacity = 12;
    let $player_danmaku_opacity = message.player_danmaku_opacity;
    if ($player_danmaku_opacity !== undefined) {
        writeVarint32(bb, 101);
        writeFloat(bb, $player_danmaku_opacity);
    }
    // optional float player_danmaku_scalingfactor = 13;
    let $player_danmaku_scalingfactor = message.player_danmaku_scalingfactor;
    if ($player_danmaku_scalingfactor !== undefined) {
        writeVarint32(bb, 109);
        writeFloat(bb, $player_danmaku_scalingfactor);
    }
    // optional float player_danmaku_domain = 14;
    let $player_danmaku_domain = message.player_danmaku_domain;
    if ($player_danmaku_domain !== undefined) {
        writeVarint32(bb, 117);
        writeFloat(bb, $player_danmaku_domain);
    }
    // optional int32 player_danmaku_speed = 15;
    let $player_danmaku_speed = message.player_danmaku_speed;
    if ($player_danmaku_speed !== undefined) {
        writeVarint32(bb, 120);
        writeVarint64(bb, intToLong($player_danmaku_speed));
    }
    // optional bool player_danmaku_enableblocklist = 16;
    let $player_danmaku_enableblocklist = message.player_danmaku_enableblocklist;
    if ($player_danmaku_enableblocklist !== undefined) {
        writeVarint32(bb, 128);
        writeByte(bb, $player_danmaku_enableblocklist ? 1 : 0);
    }
    // optional bool inline_player_danmaku_switch = 17;
    let $inline_player_danmaku_switch = message.inline_player_danmaku_switch;
    if ($inline_player_danmaku_switch !== undefined) {
        writeVarint32(bb, 136);
        writeByte(bb, $inline_player_danmaku_switch ? 1 : 0);
    }
    // optional int32 inline_player_danmaku_config = 18;
    let $inline_player_danmaku_config = message.inline_player_danmaku_config;
    if ($inline_player_danmaku_config !== undefined) {
        writeVarint32(bb, 144);
        writeVarint64(bb, intToLong($inline_player_danmaku_config));
    }
    // optional int32 player_danmaku_ios_switch_save = 19;
    let $player_danmaku_ios_switch_save = message.player_danmaku_ios_switch_save;
    if ($player_danmaku_ios_switch_save !== undefined) {
        writeVarint32(bb, 152);
        writeVarint64(bb, intToLong($player_danmaku_ios_switch_save));
    }
    // optional int32 player_danmaku_senior_mode_switch = 20;
    let $player_danmaku_senior_mode_switch = message.player_danmaku_senior_mode_switch;
    if ($player_danmaku_senior_mode_switch !== undefined) {
        writeVarint32(bb, 160);
        writeVarint64(bb, intToLong($player_danmaku_senior_mode_switch));
    }
    // optional int32 player_danmaku_ai_recommended_level_v2 = 21;
    let $player_danmaku_ai_recommended_level_v2 = message.player_danmaku_ai_recommended_level_v2;
    if ($player_danmaku_ai_recommended_level_v2 !== undefined) {
        writeVarint32(bb, 168);
        writeVarint64(bb, intToLong($player_danmaku_ai_recommended_level_v2));
    }
    // optional map<int32, int32> player_danmaku_ai_recommended_level_v2_map = 22;
    let map$player_danmaku_ai_recommended_level_v2_map = message.player_danmaku_ai_recommended_level_v2_map;
    if (map$player_danmaku_ai_recommended_level_v2_map !== undefined) {
        for (let key in map$player_danmaku_ai_recommended_level_v2_map) {
            let nested = popByteBuffer();
            let value = map$player_danmaku_ai_recommended_level_v2_map[key];
            writeVarint32(nested, 8);
            writeVarint64(nested, intToLong(+key));
            writeVarint32(nested, 16);
            writeVarint64(nested, intToLong(value));
            writeVarint32(bb, 178);
            writeVarint32(bb, nested.offset);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
}
export function decodeDanmuPlayerConfig(binary) {
    return _decodeDanmuPlayerConfig(wrapByteBuffer(binary));
}
function _decodeDanmuPlayerConfig(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional bool player_danmaku_switch = 1;
            case 1: {
                message.player_danmaku_switch = !!readByte(bb);
                break;
            }
            // optional bool player_danmaku_switch_save = 2;
            case 2: {
                message.player_danmaku_switch_save = !!readByte(bb);
                break;
            }
            // optional bool player_danmaku_use_default_config = 3;
            case 3: {
                message.player_danmaku_use_default_config = !!readByte(bb);
                break;
            }
            // optional bool player_danmaku_ai_recommended_switch = 4;
            case 4: {
                message.player_danmaku_ai_recommended_switch = !!readByte(bb);
                break;
            }
            // optional int32 player_danmaku_ai_recommended_level = 5;
            case 5: {
                message.player_danmaku_ai_recommended_level = readVarint32(bb);
                break;
            }
            // optional bool player_danmaku_blocktop = 6;
            case 6: {
                message.player_danmaku_blocktop = !!readByte(bb);
                break;
            }
            // optional bool player_danmaku_blockscroll = 7;
            case 7: {
                message.player_danmaku_blockscroll = !!readByte(bb);
                break;
            }
            // optional bool player_danmaku_blockbottom = 8;
            case 8: {
                message.player_danmaku_blockbottom = !!readByte(bb);
                break;
            }
            // optional bool player_danmaku_blockcolorful = 9;
            case 9: {
                message.player_danmaku_blockcolorful = !!readByte(bb);
                break;
            }
            // optional bool player_danmaku_blockrepeat = 10;
            case 10: {
                message.player_danmaku_blockrepeat = !!readByte(bb);
                break;
            }
            // optional bool player_danmaku_blockspecial = 11;
            case 11: {
                message.player_danmaku_blockspecial = !!readByte(bb);
                break;
            }
            // optional float player_danmaku_opacity = 12;
            case 12: {
                message.player_danmaku_opacity = readFloat(bb);
                break;
            }
            // optional float player_danmaku_scalingfactor = 13;
            case 13: {
                message.player_danmaku_scalingfactor = readFloat(bb);
                break;
            }
            // optional float player_danmaku_domain = 14;
            case 14: {
                message.player_danmaku_domain = readFloat(bb);
                break;
            }
            // optional int32 player_danmaku_speed = 15;
            case 15: {
                message.player_danmaku_speed = readVarint32(bb);
                break;
            }
            // optional bool player_danmaku_enableblocklist = 16;
            case 16: {
                message.player_danmaku_enableblocklist = !!readByte(bb);
                break;
            }
            // optional bool inline_player_danmaku_switch = 17;
            case 17: {
                message.inline_player_danmaku_switch = !!readByte(bb);
                break;
            }
            // optional int32 inline_player_danmaku_config = 18;
            case 18: {
                message.inline_player_danmaku_config = readVarint32(bb);
                break;
            }
            // optional int32 player_danmaku_ios_switch_save = 19;
            case 19: {
                message.player_danmaku_ios_switch_save = readVarint32(bb);
                break;
            }
            // optional int32 player_danmaku_senior_mode_switch = 20;
            case 20: {
                message.player_danmaku_senior_mode_switch = readVarint32(bb);
                break;
            }
            // optional int32 player_danmaku_ai_recommended_level_v2 = 21;
            case 21: {
                message.player_danmaku_ai_recommended_level_v2 = readVarint32(bb);
                break;
            }
            // optional map<int32, int32> player_danmaku_ai_recommended_level_v2_map = 22;
            case 22: {
                let values = message.player_danmaku_ai_recommended_level_v2_map || (message.player_danmaku_ai_recommended_level_v2_map = {});
                let outerLimit = pushTemporaryLength(bb);
                let key;
                let value;
                end_of_entry: while (!isAtEnd(bb)) {
                    let tag = readVarint32(bb);
                    switch (tag >>> 3) {
                        case 0:
                            break end_of_entry;
                        case 1: {
                            key = readVarint32(bb);
                            break;
                        }
                        case 2: {
                            value = readVarint32(bb);
                            break;
                        }
                        default:
                            skipUnknownField(bb, tag & 7);
                    }
                }
                if (key === undefined || value === undefined)
                    throw new Error("Invalid data for map: player_danmaku_ai_recommended_level_v2_map");
                values[key] = value;
                bb.limit = outerLimit;
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeDanmuPlayerConfigPanel(message) {
    let bb = popByteBuffer();
    _encodeDanmuPlayerConfigPanel(message, bb);
    return toUint8Array(bb);
}
function _encodeDanmuPlayerConfigPanel(message, bb) {
    // optional string selection_text = 1;
    let $selection_text = message.selection_text;
    if ($selection_text !== undefined) {
        writeVarint32(bb, 10);
        writeString(bb, $selection_text);
    }
}
export function decodeDanmuPlayerConfigPanel(binary) {
    return _decodeDanmuPlayerConfigPanel(wrapByteBuffer(binary));
}
function _decodeDanmuPlayerConfigPanel(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional string selection_text = 1;
            case 1: {
                message.selection_text = readString(bb, readVarint32(bb));
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeDanmuPlayerDynamicConfig(message) {
    let bb = popByteBuffer();
    _encodeDanmuPlayerDynamicConfig(message, bb);
    return toUint8Array(bb);
}
function _encodeDanmuPlayerDynamicConfig(message, bb) {
    // optional int32 progress = 1;
    let $progress = message.progress;
    if ($progress !== undefined) {
        writeVarint32(bb, 8);
        writeVarint64(bb, intToLong($progress));
    }
    // optional float player_danmaku_domain = 14;
    let $player_danmaku_domain = message.player_danmaku_domain;
    if ($player_danmaku_domain !== undefined) {
        writeVarint32(bb, 117);
        writeFloat(bb, $player_danmaku_domain);
    }
}
export function decodeDanmuPlayerDynamicConfig(binary) {
    return _decodeDanmuPlayerDynamicConfig(wrapByteBuffer(binary));
}
function _decodeDanmuPlayerDynamicConfig(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional int32 progress = 1;
            case 1: {
                message.progress = readVarint32(bb);
                break;
            }
            // optional float player_danmaku_domain = 14;
            case 14: {
                message.player_danmaku_domain = readFloat(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeDanmuPlayerViewConfig(message) {
    let bb = popByteBuffer();
    _encodeDanmuPlayerViewConfig(message, bb);
    return toUint8Array(bb);
}
function _encodeDanmuPlayerViewConfig(message, bb) {
    // optional DanmuDefaultPlayerConfig danmuku_default_player_config = 1;
    let $danmuku_default_player_config = message.danmuku_default_player_config;
    if ($danmuku_default_player_config !== undefined) {
        writeVarint32(bb, 10);
        let nested = popByteBuffer();
        _encodeDanmuDefaultPlayerConfig($danmuku_default_player_config, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional DanmuPlayerConfig danmuku_player_config = 2;
    let $danmuku_player_config = message.danmuku_player_config;
    if ($danmuku_player_config !== undefined) {
        writeVarint32(bb, 18);
        let nested = popByteBuffer();
        _encodeDanmuPlayerConfig($danmuku_player_config, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // repeated DanmuPlayerDynamicConfig danmuku_player_dynamic_config = 3;
    let array$danmuku_player_dynamic_config = message.danmuku_player_dynamic_config;
    if (array$danmuku_player_dynamic_config !== undefined) {
        for (let value of array$danmuku_player_dynamic_config) {
            writeVarint32(bb, 26);
            let nested = popByteBuffer();
            _encodeDanmuPlayerDynamicConfig(value, nested);
            writeVarint32(bb, nested.limit);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
    // optional DanmuPlayerConfigPanel danmuku_player_config_panel = 4;
    let $danmuku_player_config_panel = message.danmuku_player_config_panel;
    if ($danmuku_player_config_panel !== undefined) {
        writeVarint32(bb, 34);
        let nested = popByteBuffer();
        _encodeDanmuPlayerConfigPanel($danmuku_player_config_panel, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
}
export function decodeDanmuPlayerViewConfig(binary) {
    return _decodeDanmuPlayerViewConfig(wrapByteBuffer(binary));
}
function _decodeDanmuPlayerViewConfig(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional DanmuDefaultPlayerConfig danmuku_default_player_config = 1;
            case 1: {
                let limit = pushTemporaryLength(bb);
                message.danmuku_default_player_config = _decodeDanmuDefaultPlayerConfig(bb);
                bb.limit = limit;
                break;
            }
            // optional DanmuPlayerConfig danmuku_player_config = 2;
            case 2: {
                let limit = pushTemporaryLength(bb);
                message.danmuku_player_config = _decodeDanmuPlayerConfig(bb);
                bb.limit = limit;
                break;
            }
            // repeated DanmuPlayerDynamicConfig danmuku_player_dynamic_config = 3;
            case 3: {
                let limit = pushTemporaryLength(bb);
                let values = message.danmuku_player_dynamic_config || (message.danmuku_player_dynamic_config = []);
                values.push(_decodeDanmuPlayerDynamicConfig(bb));
                bb.limit = limit;
                break;
            }
            // optional DanmuPlayerConfigPanel danmuku_player_config_panel = 4;
            case 4: {
                let limit = pushTemporaryLength(bb);
                message.danmuku_player_config_panel = _decodeDanmuPlayerConfigPanel(bb);
                bb.limit = limit;
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeDanmuWebPlayerConfig(message) {
    let bb = popByteBuffer();
    _encodeDanmuWebPlayerConfig(message, bb);
    return toUint8Array(bb);
}
function _encodeDanmuWebPlayerConfig(message, bb) {
    // optional bool dm_switch = 1;
    let $dm_switch = message.dm_switch;
    if ($dm_switch !== undefined) {
        writeVarint32(bb, 8);
        writeByte(bb, $dm_switch ? 1 : 0);
    }
    // optional bool ai_switch = 2;
    let $ai_switch = message.ai_switch;
    if ($ai_switch !== undefined) {
        writeVarint32(bb, 16);
        writeByte(bb, $ai_switch ? 1 : 0);
    }
    // optional int32 ai_level = 3;
    let $ai_level = message.ai_level;
    if ($ai_level !== undefined) {
        writeVarint32(bb, 24);
        writeVarint64(bb, intToLong($ai_level));
    }
    // optional bool blocktop = 4;
    let $blocktop = message.blocktop;
    if ($blocktop !== undefined) {
        writeVarint32(bb, 32);
        writeByte(bb, $blocktop ? 1 : 0);
    }
    // optional bool blockscroll = 5;
    let $blockscroll = message.blockscroll;
    if ($blockscroll !== undefined) {
        writeVarint32(bb, 40);
        writeByte(bb, $blockscroll ? 1 : 0);
    }
    // optional bool blockbottom = 6;
    let $blockbottom = message.blockbottom;
    if ($blockbottom !== undefined) {
        writeVarint32(bb, 48);
        writeByte(bb, $blockbottom ? 1 : 0);
    }
    // optional bool blockcolor = 7;
    let $blockcolor = message.blockcolor;
    if ($blockcolor !== undefined) {
        writeVarint32(bb, 56);
        writeByte(bb, $blockcolor ? 1 : 0);
    }
    // optional bool blockspecial = 8;
    let $blockspecial = message.blockspecial;
    if ($blockspecial !== undefined) {
        writeVarint32(bb, 64);
        writeByte(bb, $blockspecial ? 1 : 0);
    }
    // optional bool preventshade = 9;
    let $preventshade = message.preventshade;
    if ($preventshade !== undefined) {
        writeVarint32(bb, 72);
        writeByte(bb, $preventshade ? 1 : 0);
    }
    // optional bool dmask = 10;
    let $dmask = message.dmask;
    if ($dmask !== undefined) {
        writeVarint32(bb, 80);
        writeByte(bb, $dmask ? 1 : 0);
    }
    // optional float opacity = 11;
    let $opacity = message.opacity;
    if ($opacity !== undefined) {
        writeVarint32(bb, 93);
        writeFloat(bb, $opacity);
    }
    // optional int32 dmarea = 12;
    let $dmarea = message.dmarea;
    if ($dmarea !== undefined) {
        writeVarint32(bb, 96);
        writeVarint64(bb, intToLong($dmarea));
    }
    // optional float speedplus = 13;
    let $speedplus = message.speedplus;
    if ($speedplus !== undefined) {
        writeVarint32(bb, 109);
        writeFloat(bb, $speedplus);
    }
    // optional float fontsize = 14;
    let $fontsize = message.fontsize;
    if ($fontsize !== undefined) {
        writeVarint32(bb, 117);
        writeFloat(bb, $fontsize);
    }
    // optional bool screensync = 15;
    let $screensync = message.screensync;
    if ($screensync !== undefined) {
        writeVarint32(bb, 120);
        writeByte(bb, $screensync ? 1 : 0);
    }
    // optional bool speedsync = 16;
    let $speedsync = message.speedsync;
    if ($speedsync !== undefined) {
        writeVarint32(bb, 128);
        writeByte(bb, $speedsync ? 1 : 0);
    }
    // optional string fontfamily = 17;
    let $fontfamily = message.fontfamily;
    if ($fontfamily !== undefined) {
        writeVarint32(bb, 138);
        writeString(bb, $fontfamily);
    }
    // optional bool bold = 18;
    let $bold = message.bold;
    if ($bold !== undefined) {
        writeVarint32(bb, 144);
        writeByte(bb, $bold ? 1 : 0);
    }
    // optional int32 fontborder = 19;
    let $fontborder = message.fontborder;
    if ($fontborder !== undefined) {
        writeVarint32(bb, 152);
        writeVarint64(bb, intToLong($fontborder));
    }
    // optional string draw_type = 20;
    let $draw_type = message.draw_type;
    if ($draw_type !== undefined) {
        writeVarint32(bb, 162);
        writeString(bb, $draw_type);
    }
    // optional int32 senior_mode_switch = 21;
    let $senior_mode_switch = message.senior_mode_switch;
    if ($senior_mode_switch !== undefined) {
        writeVarint32(bb, 168);
        writeVarint64(bb, intToLong($senior_mode_switch));
    }
    // optional int32 ai_level_v2 = 22;
    let $ai_level_v2 = message.ai_level_v2;
    if ($ai_level_v2 !== undefined) {
        writeVarint32(bb, 176);
        writeVarint64(bb, intToLong($ai_level_v2));
    }
    // optional map<int32, int32> ai_level_v2_map = 23;
    let map$ai_level_v2_map = message.ai_level_v2_map;
    if (map$ai_level_v2_map !== undefined) {
        for (let key in map$ai_level_v2_map) {
            let nested = popByteBuffer();
            let value = map$ai_level_v2_map[key];
            writeVarint32(nested, 8);
            writeVarint64(nested, intToLong(+key));
            writeVarint32(nested, 16);
            writeVarint64(nested, intToLong(value));
            writeVarint32(bb, 186);
            writeVarint32(bb, nested.offset);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
}
export function decodeDanmuWebPlayerConfig(binary) {
    return _decodeDanmuWebPlayerConfig(wrapByteBuffer(binary));
}
function _decodeDanmuWebPlayerConfig(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional bool dm_switch = 1;
            case 1: {
                message.dm_switch = !!readByte(bb);
                break;
            }
            // optional bool ai_switch = 2;
            case 2: {
                message.ai_switch = !!readByte(bb);
                break;
            }
            // optional int32 ai_level = 3;
            case 3: {
                message.ai_level = readVarint32(bb);
                break;
            }
            // optional bool blocktop = 4;
            case 4: {
                message.blocktop = !!readByte(bb);
                break;
            }
            // optional bool blockscroll = 5;
            case 5: {
                message.blockscroll = !!readByte(bb);
                break;
            }
            // optional bool blockbottom = 6;
            case 6: {
                message.blockbottom = !!readByte(bb);
                break;
            }
            // optional bool blockcolor = 7;
            case 7: {
                message.blockcolor = !!readByte(bb);
                break;
            }
            // optional bool blockspecial = 8;
            case 8: {
                message.blockspecial = !!readByte(bb);
                break;
            }
            // optional bool preventshade = 9;
            case 9: {
                message.preventshade = !!readByte(bb);
                break;
            }
            // optional bool dmask = 10;
            case 10: {
                message.dmask = !!readByte(bb);
                break;
            }
            // optional float opacity = 11;
            case 11: {
                message.opacity = readFloat(bb);
                break;
            }
            // optional int32 dmarea = 12;
            case 12: {
                message.dmarea = readVarint32(bb);
                break;
            }
            // optional float speedplus = 13;
            case 13: {
                message.speedplus = readFloat(bb);
                break;
            }
            // optional float fontsize = 14;
            case 14: {
                message.fontsize = readFloat(bb);
                break;
            }
            // optional bool screensync = 15;
            case 15: {
                message.screensync = !!readByte(bb);
                break;
            }
            // optional bool speedsync = 16;
            case 16: {
                message.speedsync = !!readByte(bb);
                break;
            }
            // optional string fontfamily = 17;
            case 17: {
                message.fontfamily = readString(bb, readVarint32(bb));
                break;
            }
            // optional bool bold = 18;
            case 18: {
                message.bold = !!readByte(bb);
                break;
            }
            // optional int32 fontborder = 19;
            case 19: {
                message.fontborder = readVarint32(bb);
                break;
            }
            // optional string draw_type = 20;
            case 20: {
                message.draw_type = readString(bb, readVarint32(bb));
                break;
            }
            // optional int32 senior_mode_switch = 21;
            case 21: {
                message.senior_mode_switch = readVarint32(bb);
                break;
            }
            // optional int32 ai_level_v2 = 22;
            case 22: {
                message.ai_level_v2 = readVarint32(bb);
                break;
            }
            // optional map<int32, int32> ai_level_v2_map = 23;
            case 23: {
                let values = message.ai_level_v2_map || (message.ai_level_v2_map = {});
                let outerLimit = pushTemporaryLength(bb);
                let key;
                let value;
                end_of_entry: while (!isAtEnd(bb)) {
                    let tag = readVarint32(bb);
                    switch (tag >>> 3) {
                        case 0:
                            break end_of_entry;
                        case 1: {
                            key = readVarint32(bb);
                            break;
                        }
                        case 2: {
                            value = readVarint32(bb);
                            break;
                        }
                        default:
                            skipUnknownField(bb, tag & 7);
                    }
                }
                if (key === undefined || value === undefined)
                    throw new Error("Invalid data for map: ai_level_v2_map");
                values[key] = value;
                bb.limit = outerLimit;
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeDmColorful(message) {
    let bb = popByteBuffer();
    _encodeDmColorful(message, bb);
    return toUint8Array(bb);
}
function _encodeDmColorful(message, bb) {
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
export function decodeDmColorful(binary) {
    return _decodeDmColorful(wrapByteBuffer(binary));
}
function _decodeDmColorful(bb) {
    let message = {};
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
export function encodeDmExpoReportReq(message) {
    let bb = popByteBuffer();
    _encodeDmExpoReportReq(message, bb);
    return toUint8Array(bb);
}
function _encodeDmExpoReportReq(message, bb) {
    // optional string session_id = 1;
    let $session_id = message.session_id;
    if ($session_id !== undefined) {
        writeVarint32(bb, 10);
        writeString(bb, $session_id);
    }
    // optional int64 oid = 2;
    let $oid = message.oid;
    if ($oid !== undefined) {
        writeVarint32(bb, 16);
        writeVarint64(bb, $oid);
    }
    // optional string spmid = 4;
    let $spmid = message.spmid;
    if ($spmid !== undefined) {
        writeVarint32(bb, 34);
        writeString(bb, $spmid);
    }
}
export function decodeDmExpoReportReq(binary) {
    return _decodeDmExpoReportReq(wrapByteBuffer(binary));
}
function _decodeDmExpoReportReq(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional string session_id = 1;
            case 1: {
                message.session_id = readString(bb, readVarint32(bb));
                break;
            }
            // optional int64 oid = 2;
            case 2: {
                message.oid = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional string spmid = 4;
            case 4: {
                message.spmid = readString(bb, readVarint32(bb));
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeDmExpoReportRes(message) {
    let bb = popByteBuffer();
    _encodeDmExpoReportRes(message, bb);
    return toUint8Array(bb);
}
function _encodeDmExpoReportRes(message, bb) {
}
export function decodeDmExpoReportRes(binary) {
    return _decodeDmExpoReportRes(wrapByteBuffer(binary));
}
function _decodeDmExpoReportRes(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeDmPlayerConfigReq(message) {
    let bb = popByteBuffer();
    _encodeDmPlayerConfigReq(message, bb);
    return toUint8Array(bb);
}
function _encodeDmPlayerConfigReq(message, bb) {
    // optional int64 ts = 1;
    let $ts = message.ts;
    if ($ts !== undefined) {
        writeVarint32(bb, 8);
        writeVarint64(bb, $ts);
    }
    // optional PlayerDanmakuSwitch switch = 2;
    let $switch = message.switch;
    if ($switch !== undefined) {
        writeVarint32(bb, 18);
        let nested = popByteBuffer();
        _encodePlayerDanmakuSwitch($switch, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional PlayerDanmakuSwitchSave switch_save = 3;
    let $switch_save = message.switch_save;
    if ($switch_save !== undefined) {
        writeVarint32(bb, 26);
        let nested = popByteBuffer();
        _encodePlayerDanmakuSwitchSave($switch_save, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional PlayerDanmakuUseDefaultConfig use_default_config = 4;
    let $use_default_config = message.use_default_config;
    if ($use_default_config !== undefined) {
        writeVarint32(bb, 34);
        let nested = popByteBuffer();
        _encodePlayerDanmakuUseDefaultConfig($use_default_config, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional PlayerDanmakuAiRecommendedSwitch ai_recommended_switch = 5;
    let $ai_recommended_switch = message.ai_recommended_switch;
    if ($ai_recommended_switch !== undefined) {
        writeVarint32(bb, 42);
        let nested = popByteBuffer();
        _encodePlayerDanmakuAiRecommendedSwitch($ai_recommended_switch, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional PlayerDanmakuAiRecommendedLevel ai_recommended_level = 6;
    let $ai_recommended_level = message.ai_recommended_level;
    if ($ai_recommended_level !== undefined) {
        writeVarint32(bb, 50);
        let nested = popByteBuffer();
        _encodePlayerDanmakuAiRecommendedLevel($ai_recommended_level, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional PlayerDanmakuBlocktop blocktop = 7;
    let $blocktop = message.blocktop;
    if ($blocktop !== undefined) {
        writeVarint32(bb, 58);
        let nested = popByteBuffer();
        _encodePlayerDanmakuBlocktop($blocktop, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional PlayerDanmakuBlockscroll blockscroll = 8;
    let $blockscroll = message.blockscroll;
    if ($blockscroll !== undefined) {
        writeVarint32(bb, 66);
        let nested = popByteBuffer();
        _encodePlayerDanmakuBlockscroll($blockscroll, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional PlayerDanmakuBlockbottom blockbottom = 9;
    let $blockbottom = message.blockbottom;
    if ($blockbottom !== undefined) {
        writeVarint32(bb, 74);
        let nested = popByteBuffer();
        _encodePlayerDanmakuBlockbottom($blockbottom, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional PlayerDanmakuBlockcolorful blockcolorful = 10;
    let $blockcolorful = message.blockcolorful;
    if ($blockcolorful !== undefined) {
        writeVarint32(bb, 82);
        let nested = popByteBuffer();
        _encodePlayerDanmakuBlockcolorful($blockcolorful, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional PlayerDanmakuBlockrepeat blockrepeat = 11;
    let $blockrepeat = message.blockrepeat;
    if ($blockrepeat !== undefined) {
        writeVarint32(bb, 90);
        let nested = popByteBuffer();
        _encodePlayerDanmakuBlockrepeat($blockrepeat, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional PlayerDanmakuBlockspecial blockspecial = 12;
    let $blockspecial = message.blockspecial;
    if ($blockspecial !== undefined) {
        writeVarint32(bb, 98);
        let nested = popByteBuffer();
        _encodePlayerDanmakuBlockspecial($blockspecial, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional PlayerDanmakuOpacity opacity = 13;
    let $opacity = message.opacity;
    if ($opacity !== undefined) {
        writeVarint32(bb, 106);
        let nested = popByteBuffer();
        _encodePlayerDanmakuOpacity($opacity, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional PlayerDanmakuScalingfactor scalingfactor = 14;
    let $scalingfactor = message.scalingfactor;
    if ($scalingfactor !== undefined) {
        writeVarint32(bb, 114);
        let nested = popByteBuffer();
        _encodePlayerDanmakuScalingfactor($scalingfactor, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional PlayerDanmakuDomain domain = 15;
    let $domain = message.domain;
    if ($domain !== undefined) {
        writeVarint32(bb, 122);
        let nested = popByteBuffer();
        _encodePlayerDanmakuDomain($domain, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional PlayerDanmakuSpeed speed = 16;
    let $speed = message.speed;
    if ($speed !== undefined) {
        writeVarint32(bb, 130);
        let nested = popByteBuffer();
        _encodePlayerDanmakuSpeed($speed, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional PlayerDanmakuEnableblocklist enableblocklist = 17;
    let $enableblocklist = message.enableblocklist;
    if ($enableblocklist !== undefined) {
        writeVarint32(bb, 138);
        let nested = popByteBuffer();
        _encodePlayerDanmakuEnableblocklist($enableblocklist, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional InlinePlayerDanmakuSwitch inlinePlayerDanmakuSwitch = 18;
    let $inlinePlayerDanmakuSwitch = message.inlinePlayerDanmakuSwitch;
    if ($inlinePlayerDanmakuSwitch !== undefined) {
        writeVarint32(bb, 146);
        let nested = popByteBuffer();
        _encodeInlinePlayerDanmakuSwitch($inlinePlayerDanmakuSwitch, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional PlayerDanmakuSeniorModeSwitch senior_mode_switch = 19;
    let $senior_mode_switch = message.senior_mode_switch;
    if ($senior_mode_switch !== undefined) {
        writeVarint32(bb, 154);
        let nested = popByteBuffer();
        _encodePlayerDanmakuSeniorModeSwitch($senior_mode_switch, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional PlayerDanmakuAiRecommendedLevelV2 ai_recommended_level_v2 = 20;
    let $ai_recommended_level_v2 = message.ai_recommended_level_v2;
    if ($ai_recommended_level_v2 !== undefined) {
        writeVarint32(bb, 162);
        let nested = popByteBuffer();
        _encodePlayerDanmakuAiRecommendedLevelV2($ai_recommended_level_v2, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
}
export function decodeDmPlayerConfigReq(binary) {
    return _decodeDmPlayerConfigReq(wrapByteBuffer(binary));
}
function _decodeDmPlayerConfigReq(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional int64 ts = 1;
            case 1: {
                message.ts = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional PlayerDanmakuSwitch switch = 2;
            case 2: {
                let limit = pushTemporaryLength(bb);
                message.switch = _decodePlayerDanmakuSwitch(bb);
                bb.limit = limit;
                break;
            }
            // optional PlayerDanmakuSwitchSave switch_save = 3;
            case 3: {
                let limit = pushTemporaryLength(bb);
                message.switch_save = _decodePlayerDanmakuSwitchSave(bb);
                bb.limit = limit;
                break;
            }
            // optional PlayerDanmakuUseDefaultConfig use_default_config = 4;
            case 4: {
                let limit = pushTemporaryLength(bb);
                message.use_default_config = _decodePlayerDanmakuUseDefaultConfig(bb);
                bb.limit = limit;
                break;
            }
            // optional PlayerDanmakuAiRecommendedSwitch ai_recommended_switch = 5;
            case 5: {
                let limit = pushTemporaryLength(bb);
                message.ai_recommended_switch = _decodePlayerDanmakuAiRecommendedSwitch(bb);
                bb.limit = limit;
                break;
            }
            // optional PlayerDanmakuAiRecommendedLevel ai_recommended_level = 6;
            case 6: {
                let limit = pushTemporaryLength(bb);
                message.ai_recommended_level = _decodePlayerDanmakuAiRecommendedLevel(bb);
                bb.limit = limit;
                break;
            }
            // optional PlayerDanmakuBlocktop blocktop = 7;
            case 7: {
                let limit = pushTemporaryLength(bb);
                message.blocktop = _decodePlayerDanmakuBlocktop(bb);
                bb.limit = limit;
                break;
            }
            // optional PlayerDanmakuBlockscroll blockscroll = 8;
            case 8: {
                let limit = pushTemporaryLength(bb);
                message.blockscroll = _decodePlayerDanmakuBlockscroll(bb);
                bb.limit = limit;
                break;
            }
            // optional PlayerDanmakuBlockbottom blockbottom = 9;
            case 9: {
                let limit = pushTemporaryLength(bb);
                message.blockbottom = _decodePlayerDanmakuBlockbottom(bb);
                bb.limit = limit;
                break;
            }
            // optional PlayerDanmakuBlockcolorful blockcolorful = 10;
            case 10: {
                let limit = pushTemporaryLength(bb);
                message.blockcolorful = _decodePlayerDanmakuBlockcolorful(bb);
                bb.limit = limit;
                break;
            }
            // optional PlayerDanmakuBlockrepeat blockrepeat = 11;
            case 11: {
                let limit = pushTemporaryLength(bb);
                message.blockrepeat = _decodePlayerDanmakuBlockrepeat(bb);
                bb.limit = limit;
                break;
            }
            // optional PlayerDanmakuBlockspecial blockspecial = 12;
            case 12: {
                let limit = pushTemporaryLength(bb);
                message.blockspecial = _decodePlayerDanmakuBlockspecial(bb);
                bb.limit = limit;
                break;
            }
            // optional PlayerDanmakuOpacity opacity = 13;
            case 13: {
                let limit = pushTemporaryLength(bb);
                message.opacity = _decodePlayerDanmakuOpacity(bb);
                bb.limit = limit;
                break;
            }
            // optional PlayerDanmakuScalingfactor scalingfactor = 14;
            case 14: {
                let limit = pushTemporaryLength(bb);
                message.scalingfactor = _decodePlayerDanmakuScalingfactor(bb);
                bb.limit = limit;
                break;
            }
            // optional PlayerDanmakuDomain domain = 15;
            case 15: {
                let limit = pushTemporaryLength(bb);
                message.domain = _decodePlayerDanmakuDomain(bb);
                bb.limit = limit;
                break;
            }
            // optional PlayerDanmakuSpeed speed = 16;
            case 16: {
                let limit = pushTemporaryLength(bb);
                message.speed = _decodePlayerDanmakuSpeed(bb);
                bb.limit = limit;
                break;
            }
            // optional PlayerDanmakuEnableblocklist enableblocklist = 17;
            case 17: {
                let limit = pushTemporaryLength(bb);
                message.enableblocklist = _decodePlayerDanmakuEnableblocklist(bb);
                bb.limit = limit;
                break;
            }
            // optional InlinePlayerDanmakuSwitch inlinePlayerDanmakuSwitch = 18;
            case 18: {
                let limit = pushTemporaryLength(bb);
                message.inlinePlayerDanmakuSwitch = _decodeInlinePlayerDanmakuSwitch(bb);
                bb.limit = limit;
                break;
            }
            // optional PlayerDanmakuSeniorModeSwitch senior_mode_switch = 19;
            case 19: {
                let limit = pushTemporaryLength(bb);
                message.senior_mode_switch = _decodePlayerDanmakuSeniorModeSwitch(bb);
                bb.limit = limit;
                break;
            }
            // optional PlayerDanmakuAiRecommendedLevelV2 ai_recommended_level_v2 = 20;
            case 20: {
                let limit = pushTemporaryLength(bb);
                message.ai_recommended_level_v2 = _decodePlayerDanmakuAiRecommendedLevelV2(bb);
                bb.limit = limit;
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeDmSegConfig(message) {
    let bb = popByteBuffer();
    _encodeDmSegConfig(message, bb);
    return toUint8Array(bb);
}
function _encodeDmSegConfig(message, bb) {
    // optional int64 page_size = 1;
    let $page_size = message.page_size;
    if ($page_size !== undefined) {
        writeVarint32(bb, 8);
        writeVarint64(bb, $page_size);
    }
    // optional int64 total = 2;
    let $total = message.total;
    if ($total !== undefined) {
        writeVarint32(bb, 16);
        writeVarint64(bb, $total);
    }
}
export function decodeDmSegConfig(binary) {
    return _decodeDmSegConfig(wrapByteBuffer(binary));
}
function _decodeDmSegConfig(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional int64 page_size = 1;
            case 1: {
                message.page_size = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int64 total = 2;
            case 2: {
                message.total = readVarint64(bb, /* unsigned */ false);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeDmSegMobileReply(message) {
    let bb = popByteBuffer();
    _encodeDmSegMobileReply(message, bb);
    return toUint8Array(bb);
}
function _encodeDmSegMobileReply(message, bb) {
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
export function decodeDmSegMobileReply(binary) {
    return _decodeDmSegMobileReply(wrapByteBuffer(binary));
}
function _decodeDmSegMobileReply(bb) {
    let message = {};
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
export function encodeDmSegMobileReq(message) {
    let bb = popByteBuffer();
    _encodeDmSegMobileReq(message, bb);
    return toUint8Array(bb);
}
function _encodeDmSegMobileReq(message, bb) {
    // optional int64 pid = 1;
    let $pid = message.pid;
    if ($pid !== undefined) {
        writeVarint32(bb, 8);
        writeVarint64(bb, $pid);
    }
    // optional int64 oid = 2;
    let $oid = message.oid;
    if ($oid !== undefined) {
        writeVarint32(bb, 16);
        writeVarint64(bb, $oid);
    }
    // optional int32 type = 3;
    let $type = message.type;
    if ($type !== undefined) {
        writeVarint32(bb, 24);
        writeVarint64(bb, intToLong($type));
    }
    // optional int64 segment_index = 4;
    let $segment_index = message.segment_index;
    if ($segment_index !== undefined) {
        writeVarint32(bb, 32);
        writeVarint64(bb, $segment_index);
    }
    // optional int32 teenagers_mode = 5;
    let $teenagers_mode = message.teenagers_mode;
    if ($teenagers_mode !== undefined) {
        writeVarint32(bb, 40);
        writeVarint64(bb, intToLong($teenagers_mode));
    }
    // optional int64 ps = 6;
    let $ps = message.ps;
    if ($ps !== undefined) {
        writeVarint32(bb, 48);
        writeVarint64(bb, $ps);
    }
    // optional int64 pe = 7;
    let $pe = message.pe;
    if ($pe !== undefined) {
        writeVarint32(bb, 56);
        writeVarint64(bb, $pe);
    }
    // optional int32 pull_mode = 8;
    let $pull_mode = message.pull_mode;
    if ($pull_mode !== undefined) {
        writeVarint32(bb, 64);
        writeVarint64(bb, intToLong($pull_mode));
    }
    // optional int32 from_scene = 9;
    let $from_scene = message.from_scene;
    if ($from_scene !== undefined) {
        writeVarint32(bb, 72);
        writeVarint64(bb, intToLong($from_scene));
    }
}
export function decodeDmSegMobileReq(binary) {
    return _decodeDmSegMobileReq(wrapByteBuffer(binary));
}
function _decodeDmSegMobileReq(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional int64 pid = 1;
            case 1: {
                message.pid = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int64 oid = 2;
            case 2: {
                message.oid = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int32 type = 3;
            case 3: {
                message.type = readVarint32(bb);
                break;
            }
            // optional int64 segment_index = 4;
            case 4: {
                message.segment_index = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int32 teenagers_mode = 5;
            case 5: {
                message.teenagers_mode = readVarint32(bb);
                break;
            }
            // optional int64 ps = 6;
            case 6: {
                message.ps = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int64 pe = 7;
            case 7: {
                message.pe = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int32 pull_mode = 8;
            case 8: {
                message.pull_mode = readVarint32(bb);
                break;
            }
            // optional int32 from_scene = 9;
            case 9: {
                message.from_scene = readVarint32(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeDmSegOttReply(message) {
    let bb = popByteBuffer();
    _encodeDmSegOttReply(message, bb);
    return toUint8Array(bb);
}
function _encodeDmSegOttReply(message, bb) {
    // optional bool closed = 1;
    let $closed = message.closed;
    if ($closed !== undefined) {
        writeVarint32(bb, 8);
        writeByte(bb, $closed ? 1 : 0);
    }
    // repeated DanmakuElem elems = 2;
    let array$elems = message.elems;
    if (array$elems !== undefined) {
        for (let value of array$elems) {
            writeVarint32(bb, 18);
            let nested = popByteBuffer();
            _encodeDanmakuElem(value, nested);
            writeVarint32(bb, nested.limit);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
}
export function decodeDmSegOttReply(binary) {
    return _decodeDmSegOttReply(wrapByteBuffer(binary));
}
function _decodeDmSegOttReply(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional bool closed = 1;
            case 1: {
                message.closed = !!readByte(bb);
                break;
            }
            // repeated DanmakuElem elems = 2;
            case 2: {
                let limit = pushTemporaryLength(bb);
                let values = message.elems || (message.elems = []);
                values.push(_decodeDanmakuElem(bb));
                bb.limit = limit;
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeDmSegOttReq(message) {
    let bb = popByteBuffer();
    _encodeDmSegOttReq(message, bb);
    return toUint8Array(bb);
}
function _encodeDmSegOttReq(message, bb) {
    // optional int64 pid = 1;
    let $pid = message.pid;
    if ($pid !== undefined) {
        writeVarint32(bb, 8);
        writeVarint64(bb, $pid);
    }
    // optional int64 oid = 2;
    let $oid = message.oid;
    if ($oid !== undefined) {
        writeVarint32(bb, 16);
        writeVarint64(bb, $oid);
    }
    // optional int32 type = 3;
    let $type = message.type;
    if ($type !== undefined) {
        writeVarint32(bb, 24);
        writeVarint64(bb, intToLong($type));
    }
    // optional int64 segment_index = 4;
    let $segment_index = message.segment_index;
    if ($segment_index !== undefined) {
        writeVarint32(bb, 32);
        writeVarint64(bb, $segment_index);
    }
}
export function decodeDmSegOttReq(binary) {
    return _decodeDmSegOttReq(wrapByteBuffer(binary));
}
function _decodeDmSegOttReq(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional int64 pid = 1;
            case 1: {
                message.pid = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int64 oid = 2;
            case 2: {
                message.oid = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int32 type = 3;
            case 3: {
                message.type = readVarint32(bb);
                break;
            }
            // optional int64 segment_index = 4;
            case 4: {
                message.segment_index = readVarint64(bb, /* unsigned */ false);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeDmSegSDKReply(message) {
    let bb = popByteBuffer();
    _encodeDmSegSDKReply(message, bb);
    return toUint8Array(bb);
}
function _encodeDmSegSDKReply(message, bb) {
    // optional bool closed = 1;
    let $closed = message.closed;
    if ($closed !== undefined) {
        writeVarint32(bb, 8);
        writeByte(bb, $closed ? 1 : 0);
    }
    // repeated DanmakuElem elems = 2;
    let array$elems = message.elems;
    if (array$elems !== undefined) {
        for (let value of array$elems) {
            writeVarint32(bb, 18);
            let nested = popByteBuffer();
            _encodeDanmakuElem(value, nested);
            writeVarint32(bb, nested.limit);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
}
export function decodeDmSegSDKReply(binary) {
    return _decodeDmSegSDKReply(wrapByteBuffer(binary));
}
function _decodeDmSegSDKReply(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional bool closed = 1;
            case 1: {
                message.closed = !!readByte(bb);
                break;
            }
            // repeated DanmakuElem elems = 2;
            case 2: {
                let limit = pushTemporaryLength(bb);
                let values = message.elems || (message.elems = []);
                values.push(_decodeDanmakuElem(bb));
                bb.limit = limit;
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeDmSegSDKReq(message) {
    let bb = popByteBuffer();
    _encodeDmSegSDKReq(message, bb);
    return toUint8Array(bb);
}
function _encodeDmSegSDKReq(message, bb) {
    // optional int64 pid = 1;
    let $pid = message.pid;
    if ($pid !== undefined) {
        writeVarint32(bb, 8);
        writeVarint64(bb, $pid);
    }
    // optional int64 oid = 2;
    let $oid = message.oid;
    if ($oid !== undefined) {
        writeVarint32(bb, 16);
        writeVarint64(bb, $oid);
    }
    // optional int32 type = 3;
    let $type = message.type;
    if ($type !== undefined) {
        writeVarint32(bb, 24);
        writeVarint64(bb, intToLong($type));
    }
    // optional int64 segment_index = 4;
    let $segment_index = message.segment_index;
    if ($segment_index !== undefined) {
        writeVarint32(bb, 32);
        writeVarint64(bb, $segment_index);
    }
}
export function decodeDmSegSDKReq(binary) {
    return _decodeDmSegSDKReq(wrapByteBuffer(binary));
}
function _decodeDmSegSDKReq(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional int64 pid = 1;
            case 1: {
                message.pid = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int64 oid = 2;
            case 2: {
                message.oid = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int32 type = 3;
            case 3: {
                message.type = readVarint32(bb);
                break;
            }
            // optional int64 segment_index = 4;
            case 4: {
                message.segment_index = readVarint64(bb, /* unsigned */ false);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeDmViewReply(message) {
    let bb = popByteBuffer();
    _encodeDmViewReply(message, bb);
    return toUint8Array(bb);
}
function _encodeDmViewReply(message, bb) {
    // optional bool closed = 1;
    let $closed = message.closed;
    if ($closed !== undefined) {
        writeVarint32(bb, 8);
        writeByte(bb, $closed ? 1 : 0);
    }
    // optional VideoMask mask = 2;
    let $mask = message.mask;
    if ($mask !== undefined) {
        writeVarint32(bb, 18);
        let nested = popByteBuffer();
        _encodeVideoMask($mask, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional VideoSubtitle subtitle = 3;
    let $subtitle = message.subtitle;
    if ($subtitle !== undefined) {
        writeVarint32(bb, 26);
        let nested = popByteBuffer();
        _encodeVideoSubtitle($subtitle, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // repeated string special_dms = 4;
    let array$special_dms = message.special_dms;
    if (array$special_dms !== undefined) {
        for (let value of array$special_dms) {
            writeVarint32(bb, 34);
            writeString(bb, value);
        }
    }
    // optional DanmakuFlagConfig ai_flag = 5;
    let $ai_flag = message.ai_flag;
    if ($ai_flag !== undefined) {
        writeVarint32(bb, 42);
        let nested = popByteBuffer();
        _encodeDanmakuFlagConfig($ai_flag, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional DanmuPlayerViewConfig player_config = 6;
    let $player_config = message.player_config;
    if ($player_config !== undefined) {
        writeVarint32(bb, 50);
        let nested = popByteBuffer();
        _encodeDanmuPlayerViewConfig($player_config, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional int32 send_box_style = 7;
    let $send_box_style = message.send_box_style;
    if ($send_box_style !== undefined) {
        writeVarint32(bb, 56);
        writeVarint64(bb, intToLong($send_box_style));
    }
    // optional bool allow = 8;
    let $allow = message.allow;
    if ($allow !== undefined) {
        writeVarint32(bb, 64);
        writeByte(bb, $allow ? 1 : 0);
    }
    // optional string check_box = 9;
    let $check_box = message.check_box;
    if ($check_box !== undefined) {
        writeVarint32(bb, 74);
        writeString(bb, $check_box);
    }
    // optional string check_box_show_msg = 10;
    let $check_box_show_msg = message.check_box_show_msg;
    if ($check_box_show_msg !== undefined) {
        writeVarint32(bb, 82);
        writeString(bb, $check_box_show_msg);
    }
    // optional string text_placeholder = 11;
    let $text_placeholder = message.text_placeholder;
    if ($text_placeholder !== undefined) {
        writeVarint32(bb, 90);
        writeString(bb, $text_placeholder);
    }
    // optional string input_placeholder = 12;
    let $input_placeholder = message.input_placeholder;
    if ($input_placeholder !== undefined) {
        writeVarint32(bb, 98);
        writeString(bb, $input_placeholder);
    }
    // repeated string report_filter_content = 13;
    let array$report_filter_content = message.report_filter_content;
    if (array$report_filter_content !== undefined) {
        for (let value of array$report_filter_content) {
            writeVarint32(bb, 106);
            writeString(bb, value);
        }
    }
    // optional ExpoReport expo_report = 14;
    let $expo_report = message.expo_report;
    if ($expo_report !== undefined) {
        writeVarint32(bb, 114);
        let nested = popByteBuffer();
        _encodeExpoReport($expo_report, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional BuzzwordConfig buzzword_config = 15;
    let $buzzword_config = message.buzzword_config;
    if ($buzzword_config !== undefined) {
        writeVarint32(bb, 122);
        let nested = popByteBuffer();
        _encodeBuzzwordConfig($buzzword_config, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // repeated Expressions expressions = 16;
    let array$expressions = message.expressions;
    if (array$expressions !== undefined) {
        for (let value of array$expressions) {
            writeVarint32(bb, 130);
            let nested = popByteBuffer();
            _encodeExpressions(value, nested);
            writeVarint32(bb, nested.limit);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
    // repeated PostPanel post_panel = 17;
    let array$post_panel = message.post_panel;
    if (array$post_panel !== undefined) {
        for (let value of array$post_panel) {
            writeVarint32(bb, 138);
            let nested = popByteBuffer();
            _encodePostPanel(value, nested);
            writeVarint32(bb, nested.limit);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
    // repeated string activity_meta = 18;
    let array$activity_meta = message.activity_meta;
    if (array$activity_meta !== undefined) {
        for (let value of array$activity_meta) {
            writeVarint32(bb, 146);
            writeString(bb, value);
        }
    }
    // repeated PostPanelV2 post_panel2 = 19;
    let array$post_panel2 = message.post_panel2;
    if (array$post_panel2 !== undefined) {
        for (let value of array$post_panel2) {
            writeVarint32(bb, 154);
            let nested = popByteBuffer();
            _encodePostPanelV2(value, nested);
            writeVarint32(bb, nested.limit);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
}
export function decodeDmViewReply(binary) {
    return _decodeDmViewReply(wrapByteBuffer(binary));
}
function _decodeDmViewReply(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional bool closed = 1;
            case 1: {
                message.closed = !!readByte(bb);
                break;
            }
            // optional VideoMask mask = 2;
            case 2: {
                let limit = pushTemporaryLength(bb);
                message.mask = _decodeVideoMask(bb);
                bb.limit = limit;
                break;
            }
            // optional VideoSubtitle subtitle = 3;
            case 3: {
                let limit = pushTemporaryLength(bb);
                message.subtitle = _decodeVideoSubtitle(bb);
                bb.limit = limit;
                break;
            }
            // repeated string special_dms = 4;
            case 4: {
                let values = message.special_dms || (message.special_dms = []);
                values.push(readString(bb, readVarint32(bb)));
                break;
            }
            // optional DanmakuFlagConfig ai_flag = 5;
            case 5: {
                let limit = pushTemporaryLength(bb);
                message.ai_flag = _decodeDanmakuFlagConfig(bb);
                bb.limit = limit;
                break;
            }
            // optional DanmuPlayerViewConfig player_config = 6;
            case 6: {
                let limit = pushTemporaryLength(bb);
                message.player_config = _decodeDanmuPlayerViewConfig(bb);
                bb.limit = limit;
                break;
            }
            // optional int32 send_box_style = 7;
            case 7: {
                message.send_box_style = readVarint32(bb);
                break;
            }
            // optional bool allow = 8;
            case 8: {
                message.allow = !!readByte(bb);
                break;
            }
            // optional string check_box = 9;
            case 9: {
                message.check_box = readString(bb, readVarint32(bb));
                break;
            }
            // optional string check_box_show_msg = 10;
            case 10: {
                message.check_box_show_msg = readString(bb, readVarint32(bb));
                break;
            }
            // optional string text_placeholder = 11;
            case 11: {
                message.text_placeholder = readString(bb, readVarint32(bb));
                break;
            }
            // optional string input_placeholder = 12;
            case 12: {
                message.input_placeholder = readString(bb, readVarint32(bb));
                break;
            }
            // repeated string report_filter_content = 13;
            case 13: {
                let values = message.report_filter_content || (message.report_filter_content = []);
                values.push(readString(bb, readVarint32(bb)));
                break;
            }
            // optional ExpoReport expo_report = 14;
            case 14: {
                let limit = pushTemporaryLength(bb);
                message.expo_report = _decodeExpoReport(bb);
                bb.limit = limit;
                break;
            }
            // optional BuzzwordConfig buzzword_config = 15;
            case 15: {
                let limit = pushTemporaryLength(bb);
                message.buzzword_config = _decodeBuzzwordConfig(bb);
                bb.limit = limit;
                break;
            }
            // repeated Expressions expressions = 16;
            case 16: {
                let limit = pushTemporaryLength(bb);
                let values = message.expressions || (message.expressions = []);
                values.push(_decodeExpressions(bb));
                bb.limit = limit;
                break;
            }
            // repeated PostPanel post_panel = 17;
            case 17: {
                let limit = pushTemporaryLength(bb);
                let values = message.post_panel || (message.post_panel = []);
                values.push(_decodePostPanel(bb));
                bb.limit = limit;
                break;
            }
            // repeated string activity_meta = 18;
            case 18: {
                let values = message.activity_meta || (message.activity_meta = []);
                values.push(readString(bb, readVarint32(bb)));
                break;
            }
            // repeated PostPanelV2 post_panel2 = 19;
            case 19: {
                let limit = pushTemporaryLength(bb);
                let values = message.post_panel2 || (message.post_panel2 = []);
                values.push(_decodePostPanelV2(bb));
                bb.limit = limit;
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeDmViewReq(message) {
    let bb = popByteBuffer();
    _encodeDmViewReq(message, bb);
    return toUint8Array(bb);
}
function _encodeDmViewReq(message, bb) {
    // optional int64 pid = 1;
    let $pid = message.pid;
    if ($pid !== undefined) {
        writeVarint32(bb, 8);
        writeVarint64(bb, $pid);
    }
    // optional int64 oid = 2;
    let $oid = message.oid;
    if ($oid !== undefined) {
        writeVarint32(bb, 16);
        writeVarint64(bb, $oid);
    }
    // optional int32 type = 3;
    let $type = message.type;
    if ($type !== undefined) {
        writeVarint32(bb, 24);
        writeVarint64(bb, intToLong($type));
    }
    // optional string spmid = 4;
    let $spmid = message.spmid;
    if ($spmid !== undefined) {
        writeVarint32(bb, 34);
        writeString(bb, $spmid);
    }
    // optional int32 is_hard_boot = 5;
    let $is_hard_boot = message.is_hard_boot;
    if ($is_hard_boot !== undefined) {
        writeVarint32(bb, 40);
        writeVarint64(bb, intToLong($is_hard_boot));
    }
}
export function decodeDmViewReq(binary) {
    return _decodeDmViewReq(wrapByteBuffer(binary));
}
function _decodeDmViewReq(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional int64 pid = 1;
            case 1: {
                message.pid = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int64 oid = 2;
            case 2: {
                message.oid = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int32 type = 3;
            case 3: {
                message.type = readVarint32(bb);
                break;
            }
            // optional string spmid = 4;
            case 4: {
                message.spmid = readString(bb, readVarint32(bb));
                break;
            }
            // optional int32 is_hard_boot = 5;
            case 5: {
                message.is_hard_boot = readVarint32(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeDmWebViewReply(message) {
    let bb = popByteBuffer();
    _encodeDmWebViewReply(message, bb);
    return toUint8Array(bb);
}
function _encodeDmWebViewReply(message, bb) {
    // optional int32 state = 1;
    let $state = message.state;
    if ($state !== undefined) {
        writeVarint32(bb, 8);
        writeVarint64(bb, intToLong($state));
    }
    // optional string text = 2;
    let $text = message.text;
    if ($text !== undefined) {
        writeVarint32(bb, 18);
        writeString(bb, $text);
    }
    // optional string text_side = 3;
    let $text_side = message.text_side;
    if ($text_side !== undefined) {
        writeVarint32(bb, 26);
        writeString(bb, $text_side);
    }
    // optional DmSegConfig dm_sge = 4;
    let $dm_sge = message.dm_sge;
    if ($dm_sge !== undefined) {
        writeVarint32(bb, 34);
        let nested = popByteBuffer();
        _encodeDmSegConfig($dm_sge, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional DanmakuFlagConfig flag = 5;
    let $flag = message.flag;
    if ($flag !== undefined) {
        writeVarint32(bb, 42);
        let nested = popByteBuffer();
        _encodeDanmakuFlagConfig($flag, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // repeated string special_dms = 6;
    let array$special_dms = message.special_dms;
    if (array$special_dms !== undefined) {
        for (let value of array$special_dms) {
            writeVarint32(bb, 50);
            writeString(bb, value);
        }
    }
    // optional bool check_box = 7;
    let $check_box = message.check_box;
    if ($check_box !== undefined) {
        writeVarint32(bb, 56);
        writeByte(bb, $check_box ? 1 : 0);
    }
    // optional int64 count = 8;
    let $count = message.count;
    if ($count !== undefined) {
        writeVarint32(bb, 64);
        writeVarint64(bb, $count);
    }
    // repeated CommandDm commandDms = 9;
    let array$commandDms = message.commandDms;
    if (array$commandDms !== undefined) {
        for (let value of array$commandDms) {
            writeVarint32(bb, 74);
            let nested = popByteBuffer();
            _encodeCommandDm(value, nested);
            writeVarint32(bb, nested.limit);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
    // optional DanmuWebPlayerConfig player_config = 10;
    let $player_config = message.player_config;
    if ($player_config !== undefined) {
        writeVarint32(bb, 82);
        let nested = popByteBuffer();
        _encodeDanmuWebPlayerConfig($player_config, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // repeated string report_filter_content = 11;
    let array$report_filter_content = message.report_filter_content;
    if (array$report_filter_content !== undefined) {
        for (let value of array$report_filter_content) {
            writeVarint32(bb, 90);
            writeString(bb, value);
        }
    }
    // repeated Expressions expressions = 12;
    let array$expressions = message.expressions;
    if (array$expressions !== undefined) {
        for (let value of array$expressions) {
            writeVarint32(bb, 98);
            let nested = popByteBuffer();
            _encodeExpressions(value, nested);
            writeVarint32(bb, nested.limit);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
    // repeated PostPanel post_panel = 13;
    let array$post_panel = message.post_panel;
    if (array$post_panel !== undefined) {
        for (let value of array$post_panel) {
            writeVarint32(bb, 106);
            let nested = popByteBuffer();
            _encodePostPanel(value, nested);
            writeVarint32(bb, nested.limit);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
    // repeated string activity_meta = 14;
    let array$activity_meta = message.activity_meta;
    if (array$activity_meta !== undefined) {
        for (let value of array$activity_meta) {
            writeVarint32(bb, 114);
            writeString(bb, value);
        }
    }
}
export function decodeDmWebViewReply(binary) {
    return _decodeDmWebViewReply(wrapByteBuffer(binary));
}
function _decodeDmWebViewReply(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional int32 state = 1;
            case 1: {
                message.state = readVarint32(bb);
                break;
            }
            // optional string text = 2;
            case 2: {
                message.text = readString(bb, readVarint32(bb));
                break;
            }
            // optional string text_side = 3;
            case 3: {
                message.text_side = readString(bb, readVarint32(bb));
                break;
            }
            // optional DmSegConfig dm_sge = 4;
            case 4: {
                let limit = pushTemporaryLength(bb);
                message.dm_sge = _decodeDmSegConfig(bb);
                bb.limit = limit;
                break;
            }
            // optional DanmakuFlagConfig flag = 5;
            case 5: {
                let limit = pushTemporaryLength(bb);
                message.flag = _decodeDanmakuFlagConfig(bb);
                bb.limit = limit;
                break;
            }
            // repeated string special_dms = 6;
            case 6: {
                let values = message.special_dms || (message.special_dms = []);
                values.push(readString(bb, readVarint32(bb)));
                break;
            }
            // optional bool check_box = 7;
            case 7: {
                message.check_box = !!readByte(bb);
                break;
            }
            // optional int64 count = 8;
            case 8: {
                message.count = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // repeated CommandDm commandDms = 9;
            case 9: {
                let limit = pushTemporaryLength(bb);
                let values = message.commandDms || (message.commandDms = []);
                values.push(_decodeCommandDm(bb));
                bb.limit = limit;
                break;
            }
            // optional DanmuWebPlayerConfig player_config = 10;
            case 10: {
                let limit = pushTemporaryLength(bb);
                message.player_config = _decodeDanmuWebPlayerConfig(bb);
                bb.limit = limit;
                break;
            }
            // repeated string report_filter_content = 11;
            case 11: {
                let values = message.report_filter_content || (message.report_filter_content = []);
                values.push(readString(bb, readVarint32(bb)));
                break;
            }
            // repeated Expressions expressions = 12;
            case 12: {
                let limit = pushTemporaryLength(bb);
                let values = message.expressions || (message.expressions = []);
                values.push(_decodeExpressions(bb));
                bb.limit = limit;
                break;
            }
            // repeated PostPanel post_panel = 13;
            case 13: {
                let limit = pushTemporaryLength(bb);
                let values = message.post_panel || (message.post_panel = []);
                values.push(_decodePostPanel(bb));
                bb.limit = limit;
                break;
            }
            // repeated string activity_meta = 14;
            case 14: {
                let values = message.activity_meta || (message.activity_meta = []);
                values.push(readString(bb, readVarint32(bb)));
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeExpoReport(message) {
    let bb = popByteBuffer();
    _encodeExpoReport(message, bb);
    return toUint8Array(bb);
}
function _encodeExpoReport(message, bb) {
    // optional bool should_report_at_end = 1;
    let $should_report_at_end = message.should_report_at_end;
    if ($should_report_at_end !== undefined) {
        writeVarint32(bb, 8);
        writeByte(bb, $should_report_at_end ? 1 : 0);
    }
}
export function decodeExpoReport(binary) {
    return _decodeExpoReport(wrapByteBuffer(binary));
}
function _decodeExpoReport(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional bool should_report_at_end = 1;
            case 1: {
                message.should_report_at_end = !!readByte(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeExpression(message) {
    let bb = popByteBuffer();
    _encodeExpression(message, bb);
    return toUint8Array(bb);
}
function _encodeExpression(message, bb) {
    // repeated string keyword = 1;
    let array$keyword = message.keyword;
    if (array$keyword !== undefined) {
        for (let value of array$keyword) {
            writeVarint32(bb, 10);
            writeString(bb, value);
        }
    }
    // optional string url = 2;
    let $url = message.url;
    if ($url !== undefined) {
        writeVarint32(bb, 18);
        writeString(bb, $url);
    }
    // repeated Period period = 3;
    let array$period = message.period;
    if (array$period !== undefined) {
        for (let value of array$period) {
            writeVarint32(bb, 26);
            let nested = popByteBuffer();
            _encodePeriod(value, nested);
            writeVarint32(bb, nested.limit);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
}
export function decodeExpression(binary) {
    return _decodeExpression(wrapByteBuffer(binary));
}
function _decodeExpression(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // repeated string keyword = 1;
            case 1: {
                let values = message.keyword || (message.keyword = []);
                values.push(readString(bb, readVarint32(bb)));
                break;
            }
            // optional string url = 2;
            case 2: {
                message.url = readString(bb, readVarint32(bb));
                break;
            }
            // repeated Period period = 3;
            case 3: {
                let limit = pushTemporaryLength(bb);
                let values = message.period || (message.period = []);
                values.push(_decodePeriod(bb));
                bb.limit = limit;
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeExpressions(message) {
    let bb = popByteBuffer();
    _encodeExpressions(message, bb);
    return toUint8Array(bb);
}
function _encodeExpressions(message, bb) {
    // repeated Expression data = 1;
    let array$data = message.data;
    if (array$data !== undefined) {
        for (let value of array$data) {
            writeVarint32(bb, 10);
            let nested = popByteBuffer();
            _encodeExpression(value, nested);
            writeVarint32(bb, nested.limit);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
}
export function decodeExpressions(binary) {
    return _decodeExpressions(wrapByteBuffer(binary));
}
function _decodeExpressions(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // repeated Expression data = 1;
            case 1: {
                let limit = pushTemporaryLength(bb);
                let values = message.data || (message.data = []);
                values.push(_decodeExpression(bb));
                bb.limit = limit;
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeInlinePlayerDanmakuSwitch(message) {
    let bb = popByteBuffer();
    _encodeInlinePlayerDanmakuSwitch(message, bb);
    return toUint8Array(bb);
}
function _encodeInlinePlayerDanmakuSwitch(message, bb) {
    // optional bool value = 1;
    let $value = message.value;
    if ($value !== undefined) {
        writeVarint32(bb, 8);
        writeByte(bb, $value ? 1 : 0);
    }
}
export function decodeInlinePlayerDanmakuSwitch(binary) {
    return _decodeInlinePlayerDanmakuSwitch(wrapByteBuffer(binary));
}
function _decodeInlinePlayerDanmakuSwitch(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional bool value = 1;
            case 1: {
                message.value = !!readByte(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeLabel(message) {
    let bb = popByteBuffer();
    _encodeLabel(message, bb);
    return toUint8Array(bb);
}
function _encodeLabel(message, bb) {
    // optional string title = 1;
    let $title = message.title;
    if ($title !== undefined) {
        writeVarint32(bb, 10);
        writeString(bb, $title);
    }
    // repeated string content = 2;
    let array$content = message.content;
    if (array$content !== undefined) {
        for (let value of array$content) {
            writeVarint32(bb, 18);
            writeString(bb, value);
        }
    }
}
export function decodeLabel(binary) {
    return _decodeLabel(wrapByteBuffer(binary));
}
function _decodeLabel(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional string title = 1;
            case 1: {
                message.title = readString(bb, readVarint32(bb));
                break;
            }
            // repeated string content = 2;
            case 2: {
                let values = message.content || (message.content = []);
                values.push(readString(bb, readVarint32(bb)));
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeLabelV2(message) {
    let bb = popByteBuffer();
    _encodeLabelV2(message, bb);
    return toUint8Array(bb);
}
function _encodeLabelV2(message, bb) {
    // optional string title = 1;
    let $title = message.title;
    if ($title !== undefined) {
        writeVarint32(bb, 10);
        writeString(bb, $title);
    }
    // repeated string content = 2;
    let array$content = message.content;
    if (array$content !== undefined) {
        for (let value of array$content) {
            writeVarint32(bb, 18);
            writeString(bb, value);
        }
    }
    // optional bool exposure_once = 3;
    let $exposure_once = message.exposure_once;
    if ($exposure_once !== undefined) {
        writeVarint32(bb, 24);
        writeByte(bb, $exposure_once ? 1 : 0);
    }
    // optional int32 exposure_type = 4;
    let $exposure_type = message.exposure_type;
    if ($exposure_type !== undefined) {
        writeVarint32(bb, 32);
        writeVarint64(bb, intToLong($exposure_type));
    }
}
export function decodeLabelV2(binary) {
    return _decodeLabelV2(wrapByteBuffer(binary));
}
function _decodeLabelV2(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional string title = 1;
            case 1: {
                message.title = readString(bb, readVarint32(bb));
                break;
            }
            // repeated string content = 2;
            case 2: {
                let values = message.content || (message.content = []);
                values.push(readString(bb, readVarint32(bb)));
                break;
            }
            // optional bool exposure_once = 3;
            case 3: {
                message.exposure_once = !!readByte(bb);
                break;
            }
            // optional int32 exposure_type = 4;
            case 4: {
                message.exposure_type = readVarint32(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodePeriod(message) {
    let bb = popByteBuffer();
    _encodePeriod(message, bb);
    return toUint8Array(bb);
}
function _encodePeriod(message, bb) {
    // optional int64 start = 1;
    let $start = message.start;
    if ($start !== undefined) {
        writeVarint32(bb, 8);
        writeVarint64(bb, $start);
    }
    // optional int64 end = 2;
    let $end = message.end;
    if ($end !== undefined) {
        writeVarint32(bb, 16);
        writeVarint64(bb, $end);
    }
}
export function decodePeriod(binary) {
    return _decodePeriod(wrapByteBuffer(binary));
}
function _decodePeriod(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional int64 start = 1;
            case 1: {
                message.start = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int64 end = 2;
            case 2: {
                message.end = readVarint64(bb, /* unsigned */ false);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodePlayerDanmakuAiRecommendedLevel(message) {
    let bb = popByteBuffer();
    _encodePlayerDanmakuAiRecommendedLevel(message, bb);
    return toUint8Array(bb);
}
function _encodePlayerDanmakuAiRecommendedLevel(message, bb) {
    // optional bool value = 1;
    let $value = message.value;
    if ($value !== undefined) {
        writeVarint32(bb, 8);
        writeByte(bb, $value ? 1 : 0);
    }
}
export function decodePlayerDanmakuAiRecommendedLevel(binary) {
    return _decodePlayerDanmakuAiRecommendedLevel(wrapByteBuffer(binary));
}
function _decodePlayerDanmakuAiRecommendedLevel(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional bool value = 1;
            case 1: {
                message.value = !!readByte(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodePlayerDanmakuAiRecommendedLevelV2(message) {
    let bb = popByteBuffer();
    _encodePlayerDanmakuAiRecommendedLevelV2(message, bb);
    return toUint8Array(bb);
}
function _encodePlayerDanmakuAiRecommendedLevelV2(message, bb) {
    // optional int32 value = 1;
    let $value = message.value;
    if ($value !== undefined) {
        writeVarint32(bb, 8);
        writeVarint64(bb, intToLong($value));
    }
}
export function decodePlayerDanmakuAiRecommendedLevelV2(binary) {
    return _decodePlayerDanmakuAiRecommendedLevelV2(wrapByteBuffer(binary));
}
function _decodePlayerDanmakuAiRecommendedLevelV2(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional int32 value = 1;
            case 1: {
                message.value = readVarint32(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodePlayerDanmakuAiRecommendedSwitch(message) {
    let bb = popByteBuffer();
    _encodePlayerDanmakuAiRecommendedSwitch(message, bb);
    return toUint8Array(bb);
}
function _encodePlayerDanmakuAiRecommendedSwitch(message, bb) {
    // optional bool value = 1;
    let $value = message.value;
    if ($value !== undefined) {
        writeVarint32(bb, 8);
        writeByte(bb, $value ? 1 : 0);
    }
}
export function decodePlayerDanmakuAiRecommendedSwitch(binary) {
    return _decodePlayerDanmakuAiRecommendedSwitch(wrapByteBuffer(binary));
}
function _decodePlayerDanmakuAiRecommendedSwitch(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional bool value = 1;
            case 1: {
                message.value = !!readByte(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodePlayerDanmakuBlockbottom(message) {
    let bb = popByteBuffer();
    _encodePlayerDanmakuBlockbottom(message, bb);
    return toUint8Array(bb);
}
function _encodePlayerDanmakuBlockbottom(message, bb) {
    // optional bool value = 1;
    let $value = message.value;
    if ($value !== undefined) {
        writeVarint32(bb, 8);
        writeByte(bb, $value ? 1 : 0);
    }
}
export function decodePlayerDanmakuBlockbottom(binary) {
    return _decodePlayerDanmakuBlockbottom(wrapByteBuffer(binary));
}
function _decodePlayerDanmakuBlockbottom(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional bool value = 1;
            case 1: {
                message.value = !!readByte(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodePlayerDanmakuBlockcolorful(message) {
    let bb = popByteBuffer();
    _encodePlayerDanmakuBlockcolorful(message, bb);
    return toUint8Array(bb);
}
function _encodePlayerDanmakuBlockcolorful(message, bb) {
    // optional bool value = 1;
    let $value = message.value;
    if ($value !== undefined) {
        writeVarint32(bb, 8);
        writeByte(bb, $value ? 1 : 0);
    }
}
export function decodePlayerDanmakuBlockcolorful(binary) {
    return _decodePlayerDanmakuBlockcolorful(wrapByteBuffer(binary));
}
function _decodePlayerDanmakuBlockcolorful(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional bool value = 1;
            case 1: {
                message.value = !!readByte(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodePlayerDanmakuBlockrepeat(message) {
    let bb = popByteBuffer();
    _encodePlayerDanmakuBlockrepeat(message, bb);
    return toUint8Array(bb);
}
function _encodePlayerDanmakuBlockrepeat(message, bb) {
    // optional bool value = 1;
    let $value = message.value;
    if ($value !== undefined) {
        writeVarint32(bb, 8);
        writeByte(bb, $value ? 1 : 0);
    }
}
export function decodePlayerDanmakuBlockrepeat(binary) {
    return _decodePlayerDanmakuBlockrepeat(wrapByteBuffer(binary));
}
function _decodePlayerDanmakuBlockrepeat(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional bool value = 1;
            case 1: {
                message.value = !!readByte(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodePlayerDanmakuBlockscroll(message) {
    let bb = popByteBuffer();
    _encodePlayerDanmakuBlockscroll(message, bb);
    return toUint8Array(bb);
}
function _encodePlayerDanmakuBlockscroll(message, bb) {
    // optional bool value = 1;
    let $value = message.value;
    if ($value !== undefined) {
        writeVarint32(bb, 8);
        writeByte(bb, $value ? 1 : 0);
    }
}
export function decodePlayerDanmakuBlockscroll(binary) {
    return _decodePlayerDanmakuBlockscroll(wrapByteBuffer(binary));
}
function _decodePlayerDanmakuBlockscroll(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional bool value = 1;
            case 1: {
                message.value = !!readByte(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodePlayerDanmakuBlockspecial(message) {
    let bb = popByteBuffer();
    _encodePlayerDanmakuBlockspecial(message, bb);
    return toUint8Array(bb);
}
function _encodePlayerDanmakuBlockspecial(message, bb) {
    // optional bool value = 1;
    let $value = message.value;
    if ($value !== undefined) {
        writeVarint32(bb, 8);
        writeByte(bb, $value ? 1 : 0);
    }
}
export function decodePlayerDanmakuBlockspecial(binary) {
    return _decodePlayerDanmakuBlockspecial(wrapByteBuffer(binary));
}
function _decodePlayerDanmakuBlockspecial(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional bool value = 1;
            case 1: {
                message.value = !!readByte(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodePlayerDanmakuBlocktop(message) {
    let bb = popByteBuffer();
    _encodePlayerDanmakuBlocktop(message, bb);
    return toUint8Array(bb);
}
function _encodePlayerDanmakuBlocktop(message, bb) {
    // optional bool value = 1;
    let $value = message.value;
    if ($value !== undefined) {
        writeVarint32(bb, 8);
        writeByte(bb, $value ? 1 : 0);
    }
}
export function decodePlayerDanmakuBlocktop(binary) {
    return _decodePlayerDanmakuBlocktop(wrapByteBuffer(binary));
}
function _decodePlayerDanmakuBlocktop(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional bool value = 1;
            case 1: {
                message.value = !!readByte(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodePlayerDanmakuDomain(message) {
    let bb = popByteBuffer();
    _encodePlayerDanmakuDomain(message, bb);
    return toUint8Array(bb);
}
function _encodePlayerDanmakuDomain(message, bb) {
    // optional float value = 1;
    let $value = message.value;
    if ($value !== undefined) {
        writeVarint32(bb, 13);
        writeFloat(bb, $value);
    }
}
export function decodePlayerDanmakuDomain(binary) {
    return _decodePlayerDanmakuDomain(wrapByteBuffer(binary));
}
function _decodePlayerDanmakuDomain(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional float value = 1;
            case 1: {
                message.value = readFloat(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodePlayerDanmakuEnableblocklist(message) {
    let bb = popByteBuffer();
    _encodePlayerDanmakuEnableblocklist(message, bb);
    return toUint8Array(bb);
}
function _encodePlayerDanmakuEnableblocklist(message, bb) {
    // optional bool value = 1;
    let $value = message.value;
    if ($value !== undefined) {
        writeVarint32(bb, 8);
        writeByte(bb, $value ? 1 : 0);
    }
}
export function decodePlayerDanmakuEnableblocklist(binary) {
    return _decodePlayerDanmakuEnableblocklist(wrapByteBuffer(binary));
}
function _decodePlayerDanmakuEnableblocklist(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional bool value = 1;
            case 1: {
                message.value = !!readByte(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodePlayerDanmakuOpacity(message) {
    let bb = popByteBuffer();
    _encodePlayerDanmakuOpacity(message, bb);
    return toUint8Array(bb);
}
function _encodePlayerDanmakuOpacity(message, bb) {
    // optional float value = 1;
    let $value = message.value;
    if ($value !== undefined) {
        writeVarint32(bb, 13);
        writeFloat(bb, $value);
    }
}
export function decodePlayerDanmakuOpacity(binary) {
    return _decodePlayerDanmakuOpacity(wrapByteBuffer(binary));
}
function _decodePlayerDanmakuOpacity(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional float value = 1;
            case 1: {
                message.value = readFloat(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodePlayerDanmakuScalingfactor(message) {
    let bb = popByteBuffer();
    _encodePlayerDanmakuScalingfactor(message, bb);
    return toUint8Array(bb);
}
function _encodePlayerDanmakuScalingfactor(message, bb) {
    // optional float value = 1;
    let $value = message.value;
    if ($value !== undefined) {
        writeVarint32(bb, 13);
        writeFloat(bb, $value);
    }
}
export function decodePlayerDanmakuScalingfactor(binary) {
    return _decodePlayerDanmakuScalingfactor(wrapByteBuffer(binary));
}
function _decodePlayerDanmakuScalingfactor(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional float value = 1;
            case 1: {
                message.value = readFloat(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodePlayerDanmakuSeniorModeSwitch(message) {
    let bb = popByteBuffer();
    _encodePlayerDanmakuSeniorModeSwitch(message, bb);
    return toUint8Array(bb);
}
function _encodePlayerDanmakuSeniorModeSwitch(message, bb) {
    // optional int32 value = 1;
    let $value = message.value;
    if ($value !== undefined) {
        writeVarint32(bb, 8);
        writeVarint64(bb, intToLong($value));
    }
}
export function decodePlayerDanmakuSeniorModeSwitch(binary) {
    return _decodePlayerDanmakuSeniorModeSwitch(wrapByteBuffer(binary));
}
function _decodePlayerDanmakuSeniorModeSwitch(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional int32 value = 1;
            case 1: {
                message.value = readVarint32(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodePlayerDanmakuSpeed(message) {
    let bb = popByteBuffer();
    _encodePlayerDanmakuSpeed(message, bb);
    return toUint8Array(bb);
}
function _encodePlayerDanmakuSpeed(message, bb) {
    // optional int32 value = 1;
    let $value = message.value;
    if ($value !== undefined) {
        writeVarint32(bb, 8);
        writeVarint64(bb, intToLong($value));
    }
}
export function decodePlayerDanmakuSpeed(binary) {
    return _decodePlayerDanmakuSpeed(wrapByteBuffer(binary));
}
function _decodePlayerDanmakuSpeed(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional int32 value = 1;
            case 1: {
                message.value = readVarint32(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodePlayerDanmakuSwitch(message) {
    let bb = popByteBuffer();
    _encodePlayerDanmakuSwitch(message, bb);
    return toUint8Array(bb);
}
function _encodePlayerDanmakuSwitch(message, bb) {
    // optional bool value = 1;
    let $value = message.value;
    if ($value !== undefined) {
        writeVarint32(bb, 8);
        writeByte(bb, $value ? 1 : 0);
    }
    // optional bool can_ignore = 2;
    let $can_ignore = message.can_ignore;
    if ($can_ignore !== undefined) {
        writeVarint32(bb, 16);
        writeByte(bb, $can_ignore ? 1 : 0);
    }
}
export function decodePlayerDanmakuSwitch(binary) {
    return _decodePlayerDanmakuSwitch(wrapByteBuffer(binary));
}
function _decodePlayerDanmakuSwitch(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional bool value = 1;
            case 1: {
                message.value = !!readByte(bb);
                break;
            }
            // optional bool can_ignore = 2;
            case 2: {
                message.can_ignore = !!readByte(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodePlayerDanmakuSwitchSave(message) {
    let bb = popByteBuffer();
    _encodePlayerDanmakuSwitchSave(message, bb);
    return toUint8Array(bb);
}
function _encodePlayerDanmakuSwitchSave(message, bb) {
    // optional bool value = 1;
    let $value = message.value;
    if ($value !== undefined) {
        writeVarint32(bb, 8);
        writeByte(bb, $value ? 1 : 0);
    }
}
export function decodePlayerDanmakuSwitchSave(binary) {
    return _decodePlayerDanmakuSwitchSave(wrapByteBuffer(binary));
}
function _decodePlayerDanmakuSwitchSave(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional bool value = 1;
            case 1: {
                message.value = !!readByte(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodePlayerDanmakuUseDefaultConfig(message) {
    let bb = popByteBuffer();
    _encodePlayerDanmakuUseDefaultConfig(message, bb);
    return toUint8Array(bb);
}
function _encodePlayerDanmakuUseDefaultConfig(message, bb) {
    // optional bool value = 1;
    let $value = message.value;
    if ($value !== undefined) {
        writeVarint32(bb, 8);
        writeByte(bb, $value ? 1 : 0);
    }
}
export function decodePlayerDanmakuUseDefaultConfig(binary) {
    return _decodePlayerDanmakuUseDefaultConfig(wrapByteBuffer(binary));
}
function _decodePlayerDanmakuUseDefaultConfig(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional bool value = 1;
            case 1: {
                message.value = !!readByte(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodePostPanel(message) {
    let bb = popByteBuffer();
    _encodePostPanel(message, bb);
    return toUint8Array(bb);
}
function _encodePostPanel(message, bb) {
    // optional int64 start = 1;
    let $start = message.start;
    if ($start !== undefined) {
        writeVarint32(bb, 8);
        writeVarint64(bb, $start);
    }
    // optional int64 end = 2;
    let $end = message.end;
    if ($end !== undefined) {
        writeVarint32(bb, 16);
        writeVarint64(bb, $end);
    }
    // optional int64 priority = 3;
    let $priority = message.priority;
    if ($priority !== undefined) {
        writeVarint32(bb, 24);
        writeVarint64(bb, $priority);
    }
    // optional int64 biz_id = 4;
    let $biz_id = message.biz_id;
    if ($biz_id !== undefined) {
        writeVarint32(bb, 32);
        writeVarint64(bb, $biz_id);
    }
    // optional PostPanelBizType biz_type = 5;
    let $biz_type = message.biz_type;
    if ($biz_type !== undefined) {
        writeVarint32(bb, 40);
        writeVarint32(bb, encodePostPanelBizType[$biz_type]);
    }
    // optional ClickButton click_button = 6;
    let $click_button = message.click_button;
    if ($click_button !== undefined) {
        writeVarint32(bb, 50);
        let nested = popByteBuffer();
        _encodeClickButton($click_button, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional TextInput text_input = 7;
    let $text_input = message.text_input;
    if ($text_input !== undefined) {
        writeVarint32(bb, 58);
        let nested = popByteBuffer();
        _encodeTextInput($text_input, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional CheckBox check_box = 8;
    let $check_box = message.check_box;
    if ($check_box !== undefined) {
        writeVarint32(bb, 66);
        let nested = popByteBuffer();
        _encodeCheckBox($check_box, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional Toast toast = 9;
    let $toast = message.toast;
    if ($toast !== undefined) {
        writeVarint32(bb, 74);
        let nested = popByteBuffer();
        _encodeToast($toast, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
}
export function decodePostPanel(binary) {
    return _decodePostPanel(wrapByteBuffer(binary));
}
function _decodePostPanel(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional int64 start = 1;
            case 1: {
                message.start = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int64 end = 2;
            case 2: {
                message.end = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int64 priority = 3;
            case 3: {
                message.priority = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int64 biz_id = 4;
            case 4: {
                message.biz_id = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional PostPanelBizType biz_type = 5;
            case 5: {
                message.biz_type = decodePostPanelBizType[readVarint32(bb)];
                break;
            }
            // optional ClickButton click_button = 6;
            case 6: {
                let limit = pushTemporaryLength(bb);
                message.click_button = _decodeClickButton(bb);
                bb.limit = limit;
                break;
            }
            // optional TextInput text_input = 7;
            case 7: {
                let limit = pushTemporaryLength(bb);
                message.text_input = _decodeTextInput(bb);
                bb.limit = limit;
                break;
            }
            // optional CheckBox check_box = 8;
            case 8: {
                let limit = pushTemporaryLength(bb);
                message.check_box = _decodeCheckBox(bb);
                bb.limit = limit;
                break;
            }
            // optional Toast toast = 9;
            case 9: {
                let limit = pushTemporaryLength(bb);
                message.toast = _decodeToast(bb);
                bb.limit = limit;
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodePostPanelV2(message) {
    let bb = popByteBuffer();
    _encodePostPanelV2(message, bb);
    return toUint8Array(bb);
}
function _encodePostPanelV2(message, bb) {
    // optional int64 start = 1;
    let $start = message.start;
    if ($start !== undefined) {
        writeVarint32(bb, 8);
        writeVarint64(bb, $start);
    }
    // optional int64 end = 2;
    let $end = message.end;
    if ($end !== undefined) {
        writeVarint32(bb, 16);
        writeVarint64(bb, $end);
    }
    // optional int32 biz_type = 3;
    let $biz_type = message.biz_type;
    if ($biz_type !== undefined) {
        writeVarint32(bb, 24);
        writeVarint64(bb, intToLong($biz_type));
    }
    // optional ClickButtonV2 click_button = 4;
    let $click_button = message.click_button;
    if ($click_button !== undefined) {
        writeVarint32(bb, 34);
        let nested = popByteBuffer();
        _encodeClickButtonV2($click_button, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional TextInputV2 text_input = 5;
    let $text_input = message.text_input;
    if ($text_input !== undefined) {
        writeVarint32(bb, 42);
        let nested = popByteBuffer();
        _encodeTextInputV2($text_input, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional CheckBoxV2 check_box = 6;
    let $check_box = message.check_box;
    if ($check_box !== undefined) {
        writeVarint32(bb, 50);
        let nested = popByteBuffer();
        _encodeCheckBoxV2($check_box, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional ToastV2 toast = 7;
    let $toast = message.toast;
    if ($toast !== undefined) {
        writeVarint32(bb, 58);
        let nested = popByteBuffer();
        _encodeToastV2($toast, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional BubbleV2 bubble = 8;
    let $bubble = message.bubble;
    if ($bubble !== undefined) {
        writeVarint32(bb, 66);
        let nested = popByteBuffer();
        _encodeBubbleV2($bubble, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional LabelV2 label = 9;
    let $label = message.label;
    if ($label !== undefined) {
        writeVarint32(bb, 74);
        let nested = popByteBuffer();
        _encodeLabelV2($label, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional int32 post_status = 10;
    let $post_status = message.post_status;
    if ($post_status !== undefined) {
        writeVarint32(bb, 80);
        writeVarint64(bb, intToLong($post_status));
    }
}
export function decodePostPanelV2(binary) {
    return _decodePostPanelV2(wrapByteBuffer(binary));
}
function _decodePostPanelV2(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional int64 start = 1;
            case 1: {
                message.start = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int64 end = 2;
            case 2: {
                message.end = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int32 biz_type = 3;
            case 3: {
                message.biz_type = readVarint32(bb);
                break;
            }
            // optional ClickButtonV2 click_button = 4;
            case 4: {
                let limit = pushTemporaryLength(bb);
                message.click_button = _decodeClickButtonV2(bb);
                bb.limit = limit;
                break;
            }
            // optional TextInputV2 text_input = 5;
            case 5: {
                let limit = pushTemporaryLength(bb);
                message.text_input = _decodeTextInputV2(bb);
                bb.limit = limit;
                break;
            }
            // optional CheckBoxV2 check_box = 6;
            case 6: {
                let limit = pushTemporaryLength(bb);
                message.check_box = _decodeCheckBoxV2(bb);
                bb.limit = limit;
                break;
            }
            // optional ToastV2 toast = 7;
            case 7: {
                let limit = pushTemporaryLength(bb);
                message.toast = _decodeToastV2(bb);
                bb.limit = limit;
                break;
            }
            // optional BubbleV2 bubble = 8;
            case 8: {
                let limit = pushTemporaryLength(bb);
                message.bubble = _decodeBubbleV2(bb);
                bb.limit = limit;
                break;
            }
            // optional LabelV2 label = 9;
            case 9: {
                let limit = pushTemporaryLength(bb);
                message.label = _decodeLabelV2(bb);
                bb.limit = limit;
                break;
            }
            // optional int32 post_status = 10;
            case 10: {
                message.post_status = readVarint32(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeResponse(message) {
    let bb = popByteBuffer();
    _encodeResponse(message, bb);
    return toUint8Array(bb);
}
function _encodeResponse(message, bb) {
    // optional int32 code = 1;
    let $code = message.code;
    if ($code !== undefined) {
        writeVarint32(bb, 8);
        writeVarint64(bb, intToLong($code));
    }
    // optional string message = 2;
    let $message = message.message;
    if ($message !== undefined) {
        writeVarint32(bb, 18);
        writeString(bb, $message);
    }
}
export function decodeResponse(binary) {
    return _decodeResponse(wrapByteBuffer(binary));
}
function _decodeResponse(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional int32 code = 1;
            case 1: {
                message.code = readVarint32(bb);
                break;
            }
            // optional string message = 2;
            case 2: {
                message.message = readString(bb, readVarint32(bb));
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeSubtitleItem(message) {
    let bb = popByteBuffer();
    _encodeSubtitleItem(message, bb);
    return toUint8Array(bb);
}
function _encodeSubtitleItem(message, bb) {
    // optional int64 id = 1;
    let $id = message.id;
    if ($id !== undefined) {
        writeVarint32(bb, 8);
        writeVarint64(bb, $id);
    }
    // optional string id_str = 2;
    let $id_str = message.id_str;
    if ($id_str !== undefined) {
        writeVarint32(bb, 18);
        writeString(bb, $id_str);
    }
    // optional string lan = 3;
    let $lan = message.lan;
    if ($lan !== undefined) {
        writeVarint32(bb, 26);
        writeString(bb, $lan);
    }
    // optional string lan_doc = 4;
    let $lan_doc = message.lan_doc;
    if ($lan_doc !== undefined) {
        writeVarint32(bb, 34);
        writeString(bb, $lan_doc);
    }
    // optional string subtitle_url = 5;
    let $subtitle_url = message.subtitle_url;
    if ($subtitle_url !== undefined) {
        writeVarint32(bb, 42);
        writeString(bb, $subtitle_url);
    }
    // optional UserInfo author = 6;
    let $author = message.author;
    if ($author !== undefined) {
        writeVarint32(bb, 50);
        let nested = popByteBuffer();
        _encodeUserInfo($author, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
    // optional SubtitleType type = 7;
    let $type = message.type;
    if ($type !== undefined) {
        writeVarint32(bb, 56);
        writeVarint32(bb, encodeSubtitleType[$type]);
    }
    // optional string lan_doc_brief = 8;
    let $lan_doc_brief = message.lan_doc_brief;
    if ($lan_doc_brief !== undefined) {
        writeVarint32(bb, 66);
        writeString(bb, $lan_doc_brief);
    }
    // optional SubtitleAiType ai_type = 9;
    let $ai_type = message.ai_type;
    if ($ai_type !== undefined) {
        writeVarint32(bb, 72);
        writeVarint32(bb, encodeSubtitleAiType[$ai_type]);
    }
    // optional SubtitleAiStatus ai_status = 10;
    let $ai_status = message.ai_status;
    if ($ai_status !== undefined) {
        writeVarint32(bb, 80);
        writeVarint32(bb, encodeSubtitleAiStatus[$ai_status]);
    }
}
export function decodeSubtitleItem(binary) {
    return _decodeSubtitleItem(wrapByteBuffer(binary));
}
function _decodeSubtitleItem(bb) {
    let message = {};
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
            // optional string id_str = 2;
            case 2: {
                message.id_str = readString(bb, readVarint32(bb));
                break;
            }
            // optional string lan = 3;
            case 3: {
                message.lan = readString(bb, readVarint32(bb));
                break;
            }
            // optional string lan_doc = 4;
            case 4: {
                message.lan_doc = readString(bb, readVarint32(bb));
                break;
            }
            // optional string subtitle_url = 5;
            case 5: {
                message.subtitle_url = readString(bb, readVarint32(bb));
                break;
            }
            // optional UserInfo author = 6;
            case 6: {
                let limit = pushTemporaryLength(bb);
                message.author = _decodeUserInfo(bb);
                bb.limit = limit;
                break;
            }
            // optional SubtitleType type = 7;
            case 7: {
                message.type = decodeSubtitleType[readVarint32(bb)];
                break;
            }
            // optional string lan_doc_brief = 8;
            case 8: {
                message.lan_doc_brief = readString(bb, readVarint32(bb));
                break;
            }
            // optional SubtitleAiType ai_type = 9;
            case 9: {
                message.ai_type = decodeSubtitleAiType[readVarint32(bb)];
                break;
            }
            // optional SubtitleAiStatus ai_status = 10;
            case 10: {
                message.ai_status = decodeSubtitleAiStatus[readVarint32(bb)];
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeTextInput(message) {
    let bb = popByteBuffer();
    _encodeTextInput(message, bb);
    return toUint8Array(bb);
}
function _encodeTextInput(message, bb) {
    // repeated string portrait_placeholder = 1;
    let array$portrait_placeholder = message.portrait_placeholder;
    if (array$portrait_placeholder !== undefined) {
        for (let value of array$portrait_placeholder) {
            writeVarint32(bb, 10);
            writeString(bb, value);
        }
    }
    // repeated string landscape_placeholder = 2;
    let array$landscape_placeholder = message.landscape_placeholder;
    if (array$landscape_placeholder !== undefined) {
        for (let value of array$landscape_placeholder) {
            writeVarint32(bb, 18);
            writeString(bb, value);
        }
    }
    // optional RenderType render_type = 3;
    let $render_type = message.render_type;
    if ($render_type !== undefined) {
        writeVarint32(bb, 24);
        writeVarint32(bb, encodeRenderType[$render_type]);
    }
    // optional bool placeholder_post = 4;
    let $placeholder_post = message.placeholder_post;
    if ($placeholder_post !== undefined) {
        writeVarint32(bb, 32);
        writeByte(bb, $placeholder_post ? 1 : 0);
    }
    // optional bool show = 5;
    let $show = message.show;
    if ($show !== undefined) {
        writeVarint32(bb, 40);
        writeByte(bb, $show ? 1 : 0);
    }
    // repeated Avatar avatar = 6;
    let array$avatar = message.avatar;
    if (array$avatar !== undefined) {
        for (let value of array$avatar) {
            writeVarint32(bb, 50);
            let nested = popByteBuffer();
            _encodeAvatar(value, nested);
            writeVarint32(bb, nested.limit);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
    // optional PostStatus post_status = 7;
    let $post_status = message.post_status;
    if ($post_status !== undefined) {
        writeVarint32(bb, 56);
        writeVarint32(bb, encodePostStatus[$post_status]);
    }
    // optional Label label = 8;
    let $label = message.label;
    if ($label !== undefined) {
        writeVarint32(bb, 66);
        let nested = popByteBuffer();
        _encodeLabel($label, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
}
export function decodeTextInput(binary) {
    return _decodeTextInput(wrapByteBuffer(binary));
}
function _decodeTextInput(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // repeated string portrait_placeholder = 1;
            case 1: {
                let values = message.portrait_placeholder || (message.portrait_placeholder = []);
                values.push(readString(bb, readVarint32(bb)));
                break;
            }
            // repeated string landscape_placeholder = 2;
            case 2: {
                let values = message.landscape_placeholder || (message.landscape_placeholder = []);
                values.push(readString(bb, readVarint32(bb)));
                break;
            }
            // optional RenderType render_type = 3;
            case 3: {
                message.render_type = decodeRenderType[readVarint32(bb)];
                break;
            }
            // optional bool placeholder_post = 4;
            case 4: {
                message.placeholder_post = !!readByte(bb);
                break;
            }
            // optional bool show = 5;
            case 5: {
                message.show = !!readByte(bb);
                break;
            }
            // repeated Avatar avatar = 6;
            case 6: {
                let limit = pushTemporaryLength(bb);
                let values = message.avatar || (message.avatar = []);
                values.push(_decodeAvatar(bb));
                bb.limit = limit;
                break;
            }
            // optional PostStatus post_status = 7;
            case 7: {
                message.post_status = decodePostStatus[readVarint32(bb)];
                break;
            }
            // optional Label label = 8;
            case 8: {
                let limit = pushTemporaryLength(bb);
                message.label = _decodeLabel(bb);
                bb.limit = limit;
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeTextInputV2(message) {
    let bb = popByteBuffer();
    _encodeTextInputV2(message, bb);
    return toUint8Array(bb);
}
function _encodeTextInputV2(message, bb) {
    // repeated string portrait_placeholder = 1;
    let array$portrait_placeholder = message.portrait_placeholder;
    if (array$portrait_placeholder !== undefined) {
        for (let value of array$portrait_placeholder) {
            writeVarint32(bb, 10);
            writeString(bb, value);
        }
    }
    // repeated string landscape_placeholder = 2;
    let array$landscape_placeholder = message.landscape_placeholder;
    if (array$landscape_placeholder !== undefined) {
        for (let value of array$landscape_placeholder) {
            writeVarint32(bb, 18);
            writeString(bb, value);
        }
    }
    // optional RenderType render_type = 3;
    let $render_type = message.render_type;
    if ($render_type !== undefined) {
        writeVarint32(bb, 24);
        writeVarint32(bb, encodeRenderType[$render_type]);
    }
    // optional bool placeholder_post = 4;
    let $placeholder_post = message.placeholder_post;
    if ($placeholder_post !== undefined) {
        writeVarint32(bb, 32);
        writeByte(bb, $placeholder_post ? 1 : 0);
    }
    // repeated Avatar avatar = 5;
    let array$avatar = message.avatar;
    if (array$avatar !== undefined) {
        for (let value of array$avatar) {
            writeVarint32(bb, 42);
            let nested = popByteBuffer();
            _encodeAvatar(value, nested);
            writeVarint32(bb, nested.limit);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
    // optional int32 text_input_limit = 6;
    let $text_input_limit = message.text_input_limit;
    if ($text_input_limit !== undefined) {
        writeVarint32(bb, 48);
        writeVarint64(bb, intToLong($text_input_limit));
    }
}
export function decodeTextInputV2(binary) {
    return _decodeTextInputV2(wrapByteBuffer(binary));
}
function _decodeTextInputV2(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // repeated string portrait_placeholder = 1;
            case 1: {
                let values = message.portrait_placeholder || (message.portrait_placeholder = []);
                values.push(readString(bb, readVarint32(bb)));
                break;
            }
            // repeated string landscape_placeholder = 2;
            case 2: {
                let values = message.landscape_placeholder || (message.landscape_placeholder = []);
                values.push(readString(bb, readVarint32(bb)));
                break;
            }
            // optional RenderType render_type = 3;
            case 3: {
                message.render_type = decodeRenderType[readVarint32(bb)];
                break;
            }
            // optional bool placeholder_post = 4;
            case 4: {
                message.placeholder_post = !!readByte(bb);
                break;
            }
            // repeated Avatar avatar = 5;
            case 5: {
                let limit = pushTemporaryLength(bb);
                let values = message.avatar || (message.avatar = []);
                values.push(_decodeAvatar(bb));
                bb.limit = limit;
                break;
            }
            // optional int32 text_input_limit = 6;
            case 6: {
                message.text_input_limit = readVarint32(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeToast(message) {
    let bb = popByteBuffer();
    _encodeToast(message, bb);
    return toUint8Array(bb);
}
function _encodeToast(message, bb) {
    // optional string text = 1;
    let $text = message.text;
    if ($text !== undefined) {
        writeVarint32(bb, 10);
        writeString(bb, $text);
    }
    // optional int32 duration = 2;
    let $duration = message.duration;
    if ($duration !== undefined) {
        writeVarint32(bb, 16);
        writeVarint64(bb, intToLong($duration));
    }
    // optional bool show = 3;
    let $show = message.show;
    if ($show !== undefined) {
        writeVarint32(bb, 24);
        writeByte(bb, $show ? 1 : 0);
    }
    // optional Button button = 4;
    let $button = message.button;
    if ($button !== undefined) {
        writeVarint32(bb, 34);
        let nested = popByteBuffer();
        _encodeButton($button, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
}
export function decodeToast(binary) {
    return _decodeToast(wrapByteBuffer(binary));
}
function _decodeToast(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional string text = 1;
            case 1: {
                message.text = readString(bb, readVarint32(bb));
                break;
            }
            // optional int32 duration = 2;
            case 2: {
                message.duration = readVarint32(bb);
                break;
            }
            // optional bool show = 3;
            case 3: {
                message.show = !!readByte(bb);
                break;
            }
            // optional Button button = 4;
            case 4: {
                let limit = pushTemporaryLength(bb);
                message.button = _decodeButton(bb);
                bb.limit = limit;
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeToastButtonV2(message) {
    let bb = popByteBuffer();
    _encodeToastButtonV2(message, bb);
    return toUint8Array(bb);
}
function _encodeToastButtonV2(message, bb) {
    // optional string text = 1;
    let $text = message.text;
    if ($text !== undefined) {
        writeVarint32(bb, 10);
        writeString(bb, $text);
    }
    // optional int32 action = 2;
    let $action = message.action;
    if ($action !== undefined) {
        writeVarint32(bb, 16);
        writeVarint64(bb, intToLong($action));
    }
}
export function decodeToastButtonV2(binary) {
    return _decodeToastButtonV2(wrapByteBuffer(binary));
}
function _decodeToastButtonV2(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional string text = 1;
            case 1: {
                message.text = readString(bb, readVarint32(bb));
                break;
            }
            // optional int32 action = 2;
            case 2: {
                message.action = readVarint32(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeToastV2(message) {
    let bb = popByteBuffer();
    _encodeToastV2(message, bb);
    return toUint8Array(bb);
}
function _encodeToastV2(message, bb) {
    // optional string text = 1;
    let $text = message.text;
    if ($text !== undefined) {
        writeVarint32(bb, 10);
        writeString(bb, $text);
    }
    // optional int32 duration = 2;
    let $duration = message.duration;
    if ($duration !== undefined) {
        writeVarint32(bb, 16);
        writeVarint64(bb, intToLong($duration));
    }
    // optional ToastButtonV2 toast_button_v2 = 3;
    let $toast_button_v2 = message.toast_button_v2;
    if ($toast_button_v2 !== undefined) {
        writeVarint32(bb, 26);
        let nested = popByteBuffer();
        _encodeToastButtonV2($toast_button_v2, nested);
        writeVarint32(bb, nested.limit);
        writeByteBuffer(bb, nested);
        pushByteBuffer(nested);
    }
}
export function decodeToastV2(binary) {
    return _decodeToastV2(wrapByteBuffer(binary));
}
function _decodeToastV2(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional string text = 1;
            case 1: {
                message.text = readString(bb, readVarint32(bb));
                break;
            }
            // optional int32 duration = 2;
            case 2: {
                message.duration = readVarint32(bb);
                break;
            }
            // optional ToastButtonV2 toast_button_v2 = 3;
            case 3: {
                let limit = pushTemporaryLength(bb);
                message.toast_button_v2 = _decodeToastButtonV2(bb);
                bb.limit = limit;
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeUserInfo(message) {
    let bb = popByteBuffer();
    _encodeUserInfo(message, bb);
    return toUint8Array(bb);
}
function _encodeUserInfo(message, bb) {
    // optional int64 mid = 1;
    let $mid = message.mid;
    if ($mid !== undefined) {
        writeVarint32(bb, 8);
        writeVarint64(bb, $mid);
    }
    // optional string name = 2;
    let $name = message.name;
    if ($name !== undefined) {
        writeVarint32(bb, 18);
        writeString(bb, $name);
    }
    // optional string sex = 3;
    let $sex = message.sex;
    if ($sex !== undefined) {
        writeVarint32(bb, 26);
        writeString(bb, $sex);
    }
    // optional string face = 4;
    let $face = message.face;
    if ($face !== undefined) {
        writeVarint32(bb, 34);
        writeString(bb, $face);
    }
    // optional string sign = 5;
    let $sign = message.sign;
    if ($sign !== undefined) {
        writeVarint32(bb, 42);
        writeString(bb, $sign);
    }
    // optional int32 rank = 6;
    let $rank = message.rank;
    if ($rank !== undefined) {
        writeVarint32(bb, 48);
        writeVarint64(bb, intToLong($rank));
    }
}
export function decodeUserInfo(binary) {
    return _decodeUserInfo(wrapByteBuffer(binary));
}
function _decodeUserInfo(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional int64 mid = 1;
            case 1: {
                message.mid = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional string name = 2;
            case 2: {
                message.name = readString(bb, readVarint32(bb));
                break;
            }
            // optional string sex = 3;
            case 3: {
                message.sex = readString(bb, readVarint32(bb));
                break;
            }
            // optional string face = 4;
            case 4: {
                message.face = readString(bb, readVarint32(bb));
                break;
            }
            // optional string sign = 5;
            case 5: {
                message.sign = readString(bb, readVarint32(bb));
                break;
            }
            // optional int32 rank = 6;
            case 6: {
                message.rank = readVarint32(bb);
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeVideoMask(message) {
    let bb = popByteBuffer();
    _encodeVideoMask(message, bb);
    return toUint8Array(bb);
}
function _encodeVideoMask(message, bb) {
    // optional int64 cid = 1;
    let $cid = message.cid;
    if ($cid !== undefined) {
        writeVarint32(bb, 8);
        writeVarint64(bb, $cid);
    }
    // optional int32 plat = 2;
    let $plat = message.plat;
    if ($plat !== undefined) {
        writeVarint32(bb, 16);
        writeVarint64(bb, intToLong($plat));
    }
    // optional int32 fps = 3;
    let $fps = message.fps;
    if ($fps !== undefined) {
        writeVarint32(bb, 24);
        writeVarint64(bb, intToLong($fps));
    }
    // optional int64 time = 4;
    let $time = message.time;
    if ($time !== undefined) {
        writeVarint32(bb, 32);
        writeVarint64(bb, $time);
    }
    // optional string mask_url = 5;
    let $mask_url = message.mask_url;
    if ($mask_url !== undefined) {
        writeVarint32(bb, 42);
        writeString(bb, $mask_url);
    }
}
export function decodeVideoMask(binary) {
    return _decodeVideoMask(wrapByteBuffer(binary));
}
function _decodeVideoMask(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional int64 cid = 1;
            case 1: {
                message.cid = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional int32 plat = 2;
            case 2: {
                message.plat = readVarint32(bb);
                break;
            }
            // optional int32 fps = 3;
            case 3: {
                message.fps = readVarint32(bb);
                break;
            }
            // optional int64 time = 4;
            case 4: {
                message.time = readVarint64(bb, /* unsigned */ false);
                break;
            }
            // optional string mask_url = 5;
            case 5: {
                message.mask_url = readString(bb, readVarint32(bb));
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
export function encodeVideoSubtitle(message) {
    let bb = popByteBuffer();
    _encodeVideoSubtitle(message, bb);
    return toUint8Array(bb);
}
function _encodeVideoSubtitle(message, bb) {
    // optional string lan = 1;
    let $lan = message.lan;
    if ($lan !== undefined) {
        writeVarint32(bb, 10);
        writeString(bb, $lan);
    }
    // optional string lanDoc = 2;
    let $lanDoc = message.lanDoc;
    if ($lanDoc !== undefined) {
        writeVarint32(bb, 18);
        writeString(bb, $lanDoc);
    }
    // repeated SubtitleItem subtitles = 3;
    let array$subtitles = message.subtitles;
    if (array$subtitles !== undefined) {
        for (let value of array$subtitles) {
            writeVarint32(bb, 26);
            let nested = popByteBuffer();
            _encodeSubtitleItem(value, nested);
            writeVarint32(bb, nested.limit);
            writeByteBuffer(bb, nested);
            pushByteBuffer(nested);
        }
    }
}
export function decodeVideoSubtitle(binary) {
    return _decodeVideoSubtitle(wrapByteBuffer(binary));
}
function _decodeVideoSubtitle(bb) {
    let message = {};
    end_of_message: while (!isAtEnd(bb)) {
        let tag = readVarint32(bb);
        switch (tag >>> 3) {
            case 0:
                break end_of_message;
            // optional string lan = 1;
            case 1: {
                message.lan = readString(bb, readVarint32(bb));
                break;
            }
            // optional string lanDoc = 2;
            case 2: {
                message.lanDoc = readString(bb, readVarint32(bb));
                break;
            }
            // repeated SubtitleItem subtitles = 3;
            case 3: {
                let limit = pushTemporaryLength(bb);
                let values = message.subtitles || (message.subtitles = []);
                values.push(_decodeSubtitleItem(bb));
                bb.limit = limit;
                break;
            }
            default:
                skipUnknownField(bb, tag & 7);
        }
    }
    return message;
}
function pushTemporaryLength(bb) {
    let length = readVarint32(bb);
    let limit = bb.limit;
    bb.limit = bb.offset + length;
    return limit;
}
function skipUnknownField(bb, type) {
    switch (type) {
        case 0:
            while (readByte(bb) & 0x80) { }
            break;
        case 2:
            skip(bb, readVarint32(bb));
            break;
        case 5:
            skip(bb, 4);
            break;
        case 1:
            skip(bb, 8);
            break;
        default: throw new Error("Unimplemented type: " + type);
    }
}
function stringToLong(value) {
    return {
        low: value.charCodeAt(0) | (value.charCodeAt(1) << 16),
        high: value.charCodeAt(2) | (value.charCodeAt(3) << 16),
        unsigned: false,
    };
}
function longToString(value) {
    let low = value.low;
    let high = value.high;
    return String.fromCharCode(low & 0xFFFF, low >>> 16, high & 0xFFFF, high >>> 16);
}
// The code below was modified from https://github.com/protobufjs/bytebuffer.js
// which is under the Apache License 2.0.
let f32 = new Float32Array(1);
let f32_u8 = new Uint8Array(f32.buffer);
let f64 = new Float64Array(1);
let f64_u8 = new Uint8Array(f64.buffer);
function intToLong(value) {
    value |= 0;
    return {
        low: value,
        high: value >> 31,
        unsigned: value >= 0,
    };
}
let bbStack = [];
function popByteBuffer() {
    const bb = bbStack.pop();
    if (!bb)
        return { bytes: new Uint8Array(64), offset: 0, limit: 0 };
    bb.offset = bb.limit = 0;
    return bb;
}
function pushByteBuffer(bb) {
    bbStack.push(bb);
}
function wrapByteBuffer(bytes) {
    return { bytes, offset: 0, limit: bytes.length };
}
function toUint8Array(bb) {
    let bytes = bb.bytes;
    let limit = bb.limit;
    return bytes.length === limit ? bytes : bytes.subarray(0, limit);
}
function skip(bb, offset) {
    if (bb.offset + offset > bb.limit) {
        throw new Error('Skip past limit');
    }
    bb.offset += offset;
}
function isAtEnd(bb) {
    return bb.offset >= bb.limit;
}
function grow(bb, count) {
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
function advance(bb, count) {
    let offset = bb.offset;
    if (offset + count > bb.limit) {
        throw new Error('Read past limit');
    }
    bb.offset += count;
    return offset;
}
function readBytes(bb, count) {
    let offset = advance(bb, count);
    return bb.bytes.subarray(offset, offset + count);
}
function writeBytes(bb, buffer) {
    let offset = grow(bb, buffer.length);
    bb.bytes.set(buffer, offset);
}
function readString(bb, count) {
    // Sadly a hand-coded UTF8 decoder is much faster than subarray+TextDecoder in V8
    let offset = advance(bb, count);
    let fromCharCode = String.fromCharCode;
    let bytes = bb.bytes;
    let invalid = '\uFFFD';
    let text = '';
    for (let i = 0; i < count; i++) {
        let c1 = bytes[i + offset], c2, c3, c4, c;
        // 1 byte
        if ((c1 & 0x80) === 0) {
            text += fromCharCode(c1);
        }
        // 2 bytes
        else if ((c1 & 0xE0) === 0xC0) {
            if (i + 1 >= count)
                text += invalid;
            else {
                c2 = bytes[i + offset + 1];
                if ((c2 & 0xC0) !== 0x80)
                    text += invalid;
                else {
                    c = ((c1 & 0x1F) << 6) | (c2 & 0x3F);
                    if (c < 0x80)
                        text += invalid;
                    else {
                        text += fromCharCode(c);
                        i++;
                    }
                }
            }
        }
        // 3 bytes
        else if ((c1 & 0xF0) == 0xE0) {
            if (i + 2 >= count)
                text += invalid;
            else {
                c2 = bytes[i + offset + 1];
                c3 = bytes[i + offset + 2];
                if (((c2 | (c3 << 8)) & 0xC0C0) !== 0x8080)
                    text += invalid;
                else {
                    c = ((c1 & 0x0F) << 12) | ((c2 & 0x3F) << 6) | (c3 & 0x3F);
                    if (c < 0x0800 || (c >= 0xD800 && c <= 0xDFFF))
                        text += invalid;
                    else {
                        text += fromCharCode(c);
                        i += 2;
                    }
                }
            }
        }
        // 4 bytes
        else if ((c1 & 0xF8) == 0xF0) {
            if (i + 3 >= count)
                text += invalid;
            else {
                c2 = bytes[i + offset + 1];
                c3 = bytes[i + offset + 2];
                c4 = bytes[i + offset + 3];
                if (((c2 | (c3 << 8) | (c4 << 16)) & 0xC0C0C0) !== 0x808080)
                    text += invalid;
                else {
                    c = ((c1 & 0x07) << 0x12) | ((c2 & 0x3F) << 0x0C) | ((c3 & 0x3F) << 0x06) | (c4 & 0x3F);
                    if (c < 0x10000 || c > 0x10FFFF)
                        text += invalid;
                    else {
                        c -= 0x10000;
                        text += fromCharCode((c >> 10) + 0xD800, (c & 0x3FF) + 0xDC00);
                        i += 3;
                    }
                }
            }
        }
        else
            text += invalid;
    }
    return text;
}
function writeString(bb, text) {
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
        }
        else {
            if (c < 0x800) {
                bytes[offset++] = ((c >> 6) & 0x1F) | 0xC0;
            }
            else {
                if (c < 0x10000) {
                    bytes[offset++] = ((c >> 12) & 0x0F) | 0xE0;
                }
                else {
                    bytes[offset++] = ((c >> 18) & 0x07) | 0xF0;
                    bytes[offset++] = ((c >> 12) & 0x3F) | 0x80;
                }
                bytes[offset++] = ((c >> 6) & 0x3F) | 0x80;
            }
            bytes[offset++] = (c & 0x3F) | 0x80;
        }
    }
}
function writeByteBuffer(bb, buffer) {
    let offset = grow(bb, buffer.limit);
    let from = bb.bytes;
    let to = buffer.bytes;
    // This for loop is much faster than subarray+set on V8
    for (let i = 0, n = buffer.limit; i < n; i++) {
        from[i + offset] = to[i];
    }
}
function readByte(bb) {
    return bb.bytes[advance(bb, 1)];
}
function writeByte(bb, value) {
    let offset = grow(bb, 1);
    bb.bytes[offset] = value;
}
function readFloat(bb) {
    let offset = advance(bb, 4);
    let bytes = bb.bytes;
    // Manual copying is much faster than subarray+set in V8
    f32_u8[0] = bytes[offset++];
    f32_u8[1] = bytes[offset++];
    f32_u8[2] = bytes[offset++];
    f32_u8[3] = bytes[offset++];
    return f32[0];
}
function writeFloat(bb, value) {
    let offset = grow(bb, 4);
    let bytes = bb.bytes;
    f32[0] = value;
    // Manual copying is much faster than subarray+set in V8
    bytes[offset++] = f32_u8[0];
    bytes[offset++] = f32_u8[1];
    bytes[offset++] = f32_u8[2];
    bytes[offset++] = f32_u8[3];
}
function readDouble(bb) {
    let offset = advance(bb, 8);
    let bytes = bb.bytes;
    // Manual copying is much faster than subarray+set in V8
    f64_u8[0] = bytes[offset++];
    f64_u8[1] = bytes[offset++];
    f64_u8[2] = bytes[offset++];
    f64_u8[3] = bytes[offset++];
    f64_u8[4] = bytes[offset++];
    f64_u8[5] = bytes[offset++];
    f64_u8[6] = bytes[offset++];
    f64_u8[7] = bytes[offset++];
    return f64[0];
}
function writeDouble(bb, value) {
    let offset = grow(bb, 8);
    let bytes = bb.bytes;
    f64[0] = value;
    // Manual copying is much faster than subarray+set in V8
    bytes[offset++] = f64_u8[0];
    bytes[offset++] = f64_u8[1];
    bytes[offset++] = f64_u8[2];
    bytes[offset++] = f64_u8[3];
    bytes[offset++] = f64_u8[4];
    bytes[offset++] = f64_u8[5];
    bytes[offset++] = f64_u8[6];
    bytes[offset++] = f64_u8[7];
}
function readInt32(bb) {
    let offset = advance(bb, 4);
    let bytes = bb.bytes;
    return (bytes[offset] |
        (bytes[offset + 1] << 8) |
        (bytes[offset + 2] << 16) |
        (bytes[offset + 3] << 24));
}
function writeInt32(bb, value) {
    let offset = grow(bb, 4);
    let bytes = bb.bytes;
    bytes[offset] = value;
    bytes[offset + 1] = value >> 8;
    bytes[offset + 2] = value >> 16;
    bytes[offset + 3] = value >> 24;
}
function readInt64(bb, unsigned) {
    return {
        low: readInt32(bb),
        high: readInt32(bb),
        unsigned,
    };
}
function writeInt64(bb, value) {
    writeInt32(bb, value.low);
    writeInt32(bb, value.high);
}
function readVarint32(bb) {
    let c = 0;
    let value = 0;
    let b;
    do {
        b = readByte(bb);
        if (c < 32)
            value |= (b & 0x7F) << c;
        c += 7;
    } while (b & 0x80);
    return value;
}
function writeVarint32(bb, value) {
    value >>>= 0;
    while (value >= 0x80) {
        writeByte(bb, (value & 0x7f) | 0x80);
        value >>>= 7;
    }
    writeByte(bb, value);
}
function readVarint64(bb, unsigned) {
    let part0 = 0;
    let part1 = 0;
    let part2 = 0;
    let b;
    b = readByte(bb);
    part0 = (b & 0x7F);
    if (b & 0x80) {
        b = readByte(bb);
        part0 |= (b & 0x7F) << 7;
        if (b & 0x80) {
            b = readByte(bb);
            part0 |= (b & 0x7F) << 14;
            if (b & 0x80) {
                b = readByte(bb);
                part0 |= (b & 0x7F) << 21;
                if (b & 0x80) {
                    b = readByte(bb);
                    part1 = (b & 0x7F);
                    if (b & 0x80) {
                        b = readByte(bb);
                        part1 |= (b & 0x7F) << 7;
                        if (b & 0x80) {
                            b = readByte(bb);
                            part1 |= (b & 0x7F) << 14;
                            if (b & 0x80) {
                                b = readByte(bb);
                                part1 |= (b & 0x7F) << 21;
                                if (b & 0x80) {
                                    b = readByte(bb);
                                    part2 = (b & 0x7F);
                                    if (b & 0x80) {
                                        b = readByte(bb);
                                        part2 |= (b & 0x7F) << 7;
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
function writeVarint64(bb, value) {
    let part0 = value.low >>> 0;
    let part1 = ((value.low >>> 28) | (value.high << 4)) >>> 0;
    let part2 = value.high >>> 24;
    // ref: src/google/protobuf/io/coded_stream.cc
    let size = part2 === 0 ?
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
        case 10: bytes[offset + 9] = (part2 >>> 7) & 0x01;
        case 9: bytes[offset + 8] = size !== 9 ? part2 | 0x80 : part2 & 0x7F;
        case 8: bytes[offset + 7] = size !== 8 ? (part1 >>> 21) | 0x80 : (part1 >>> 21) & 0x7F;
        case 7: bytes[offset + 6] = size !== 7 ? (part1 >>> 14) | 0x80 : (part1 >>> 14) & 0x7F;
        case 6: bytes[offset + 5] = size !== 6 ? (part1 >>> 7) | 0x80 : (part1 >>> 7) & 0x7F;
        case 5: bytes[offset + 4] = size !== 5 ? part1 | 0x80 : part1 & 0x7F;
        case 4: bytes[offset + 3] = size !== 4 ? (part0 >>> 21) | 0x80 : (part0 >>> 21) & 0x7F;
        case 3: bytes[offset + 2] = size !== 3 ? (part0 >>> 14) | 0x80 : (part0 >>> 14) & 0x7F;
        case 2: bytes[offset + 1] = size !== 2 ? (part0 >>> 7) | 0x80 : (part0 >>> 7) & 0x7F;
        case 1: bytes[offset] = size !== 1 ? part0 | 0x80 : part0 & 0x7F;
    }
}
function readVarint32ZigZag(bb) {
    let value = readVarint32(bb);
    // ref: src/google/protobuf/wire_format_lite.h
    return (value >>> 1) ^ -(value & 1);
}
function writeVarint32ZigZag(bb, value) {
    // ref: src/google/protobuf/wire_format_lite.h
    writeVarint32(bb, (value << 1) ^ (value >> 31));
}
function readVarint64ZigZag(bb) {
    let value = readVarint64(bb, /* unsigned */ false);
    let low = value.low;
    let high = value.high;
    let flip = -(low & 1);
    // ref: src/google/protobuf/wire_format_lite.h
    return {
        low: ((low >>> 1) | (high << 31)) ^ flip,
        high: (high >>> 1) ^ flip,
        unsigned: false,
    };
}
function writeVarint64ZigZag(bb, value) {
    let low = value.low;
    let high = value.high;
    let flip = high >> 31;
    // ref: src/google/protobuf/wire_format_lite.h
    writeVarint64(bb, {
        low: (low << 1) ^ flip,
        high: ((high << 1) | (low >>> 31)) ^ flip,
        unsigned: false,
    });
}
