/**
 * Convert DmSegMobileReply binary to readable XML.
 * @author https://github.com/btjawa
 * @license MIT
 */
export declare function DmSegMobileReplyToXML(binary: Uint8Array): string;
export declare const enum AvatarType {
    AvatarTypeNone = "AvatarTypeNone",
    AvatarTypeNFT = "AvatarTypeNFT"
}
export declare const encodeAvatarType: {
    [key: string]: number;
};
export declare const decodeAvatarType: {
    [key: number]: AvatarType;
};
export declare const enum BubbleType {
    BubbleTypeNone = "BubbleTypeNone",
    BubbleTypeClickButton = "BubbleTypeClickButton",
    BubbleTypeDmSettingPanel = "BubbleTypeDmSettingPanel"
}
export declare const encodeBubbleType: {
    [key: string]: number;
};
export declare const decodeBubbleType: {
    [key: number]: BubbleType;
};
export declare const enum CheckboxType {
    CheckboxTypeNone = "CheckboxTypeNone",
    CheckboxTypeEncourage = "CheckboxTypeEncourage",
    CheckboxTypeColorDM = "CheckboxTypeColorDM"
}
export declare const encodeCheckboxType: {
    [key: string]: number;
};
export declare const decodeCheckboxType: {
    [key: number]: CheckboxType;
};
export declare const enum DMAttrBit {
    DMAttrBitProtect = "DMAttrBitProtect",
    DMAttrBitFromLive = "DMAttrBitFromLive",
    DMAttrHighLike = "DMAttrHighLike"
}
export declare const encodeDMAttrBit: {
    [key: string]: number;
};
export declare const decodeDMAttrBit: {
    [key: number]: DMAttrBit;
};
export declare const enum DmColorfulType {
    NoneType = "NoneType",
    VipGradualColor = "VipGradualColor"
}
export declare const encodeDmColorfulType: {
    [key: string]: number;
};
export declare const decodeDmColorfulType: {
    [key: number]: DmColorfulType;
};
export declare const enum ExposureType {
    ExposureTypeNone = "ExposureTypeNone",
    ExposureTypeDMSend = "ExposureTypeDMSend"
}
export declare const encodeExposureType: {
    [key: string]: number;
};
export declare const decodeExposureType: {
    [key: number]: ExposureType;
};
export declare const enum PostPanelBizType {
    PostPanelBizTypeNone = "PostPanelBizTypeNone",
    PostPanelBizTypeEncourage = "PostPanelBizTypeEncourage",
    PostPanelBizTypeColorDM = "PostPanelBizTypeColorDM",
    PostPanelBizTypeNFTDM = "PostPanelBizTypeNFTDM",
    PostPanelBizTypeFragClose = "PostPanelBizTypeFragClose",
    PostPanelBizTypeRecommend = "PostPanelBizTypeRecommend"
}
export declare const encodePostPanelBizType: {
    [key: string]: number;
};
export declare const decodePostPanelBizType: {
    [key: number]: PostPanelBizType;
};
export declare const enum PostStatus {
    PostStatusNormal = "PostStatusNormal",
    PostStatusClosed = "PostStatusClosed"
}
export declare const encodePostStatus: {
    [key: string]: number;
};
export declare const decodePostStatus: {
    [key: number]: PostStatus;
};
export declare const enum RenderType {
    RenderTypeNone = "RenderTypeNone",
    RenderTypeSingle = "RenderTypeSingle",
    RenderTypeRotation = "RenderTypeRotation"
}
export declare const encodeRenderType: {
    [key: string]: number;
};
export declare const decodeRenderType: {
    [key: number]: RenderType;
};
export declare const enum SubtitleAiStatus {
    None = "None",
    Exposure = "Exposure",
    Assist = "Assist"
}
export declare const encodeSubtitleAiStatus: {
    [key: string]: number;
};
export declare const decodeSubtitleAiStatus: {
    [key: number]: SubtitleAiStatus;
};
export declare const enum SubtitleAiType {
    Normal = "Normal",
    Translate = "Translate"
}
export declare const encodeSubtitleAiType: {
    [key: string]: number;
};
export declare const decodeSubtitleAiType: {
    [key: number]: SubtitleAiType;
};
export declare const enum SubtitleType {
    CC = "CC",
    AI = "AI"
}
export declare const encodeSubtitleType: {
    [key: string]: number;
};
export declare const decodeSubtitleType: {
    [key: number]: SubtitleType;
};
export declare const enum ToastFunctionType {
    ToastFunctionTypeNone = "ToastFunctionTypeNone",
    ToastFunctionTypePostPanel = "ToastFunctionTypePostPanel"
}
export declare const encodeToastFunctionType: {
    [key: string]: number;
};
export declare const decodeToastFunctionType: {
    [key: number]: ToastFunctionType;
};
export interface Avatar {
    id?: string;
    url?: string;
    avatar_type?: AvatarType;
}
export declare function encodeAvatar(message: Avatar): Uint8Array;
export declare function decodeAvatar(binary: Uint8Array): Avatar;
export interface Bubble {
    text?: string;
    url?: string;
}
export declare function encodeBubble(message: Bubble): Uint8Array;
export declare function decodeBubble(binary: Uint8Array): Bubble;
export interface BubbleV2 {
    text?: string;
    url?: string;
    bubble_type?: BubbleType;
    exposure_once?: boolean;
    exposure_type?: ExposureType;
}
export declare function encodeBubbleV2(message: BubbleV2): Uint8Array;
export declare function decodeBubbleV2(binary: Uint8Array): BubbleV2;
export interface Button {
    text?: string;
    action?: number;
}
export declare function encodeButton(message: Button): Uint8Array;
export declare function decodeButton(binary: Uint8Array): Button;
export interface BuzzwordConfig {
    keywords?: BuzzwordShowConfig[];
}
export declare function encodeBuzzwordConfig(message: BuzzwordConfig): Uint8Array;
export declare function decodeBuzzwordConfig(binary: Uint8Array): BuzzwordConfig;
export interface BuzzwordShowConfig {
    name?: string;
    schema?: string;
    source?: number;
    id?: Long;
    buzzword_id?: Long;
    schema_type?: number;
}
export declare function encodeBuzzwordShowConfig(message: BuzzwordShowConfig): Uint8Array;
export declare function decodeBuzzwordShowConfig(binary: Uint8Array): BuzzwordShowConfig;
export interface CheckBox {
    text?: string;
    type?: CheckboxType;
    default_value?: boolean;
    show?: boolean;
}
export declare function encodeCheckBox(message: CheckBox): Uint8Array;
export declare function decodeCheckBox(binary: Uint8Array): CheckBox;
export interface CheckBoxV2 {
    text?: string;
    type?: number;
    default_value?: boolean;
}
export declare function encodeCheckBoxV2(message: CheckBoxV2): Uint8Array;
export declare function decodeCheckBoxV2(binary: Uint8Array): CheckBoxV2;
export interface ClickButton {
    portrait_text?: string[];
    landscape_text?: string[];
    portrait_text_focus?: string[];
    landscape_text_focus?: string[];
    render_type?: RenderType;
    show?: boolean;
    bubble?: Bubble;
}
export declare function encodeClickButton(message: ClickButton): Uint8Array;
export declare function decodeClickButton(binary: Uint8Array): ClickButton;
export interface ClickButtonV2 {
    portrait_text?: string[];
    landscape_text?: string[];
    portrait_text_focus?: string[];
    landscape_text_focus?: string[];
    render_type?: number;
    text_input_post?: boolean;
    exposure_once?: boolean;
    exposure_type?: number;
}
export declare function encodeClickButtonV2(message: ClickButtonV2): Uint8Array;
export declare function decodeClickButtonV2(binary: Uint8Array): ClickButtonV2;
export interface CommandDm {
    id?: Long;
    oid?: Long;
    mid?: string;
    command?: string;
    content?: string;
    progress?: number;
    ctime?: string;
    mtime?: string;
    extra?: string;
    idStr?: string;
}
export declare function encodeCommandDm(message: CommandDm): Uint8Array;
export declare function decodeCommandDm(binary: Uint8Array): CommandDm;
export interface DanmakuAIFlag {
    dm_flags?: DanmakuFlag[];
}
export declare function encodeDanmakuAIFlag(message: DanmakuAIFlag): Uint8Array;
export declare function decodeDanmakuAIFlag(binary: Uint8Array): DanmakuAIFlag;
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
export declare function encodeDanmakuElem(message: DanmakuElem): Uint8Array;
export declare function decodeDanmakuElem(binary: Uint8Array): DanmakuElem;
export interface DanmakuFlag {
    dmid?: Long;
    flag?: number;
}
export declare function encodeDanmakuFlag(message: DanmakuFlag): Uint8Array;
export declare function decodeDanmakuFlag(binary: Uint8Array): DanmakuFlag;
export interface DanmakuFlagConfig {
    rec_flag?: number;
    rec_text?: string;
    rec_switch?: number;
}
export declare function encodeDanmakuFlagConfig(message: DanmakuFlagConfig): Uint8Array;
export declare function decodeDanmakuFlagConfig(binary: Uint8Array): DanmakuFlagConfig;
export interface DanmuDefaultPlayerConfig {
    player_danmaku_use_default_config?: boolean;
    player_danmaku_ai_recommended_switch?: boolean;
    player_danmaku_ai_recommended_level?: number;
    player_danmaku_blocktop?: boolean;
    player_danmaku_blockscroll?: boolean;
    player_danmaku_blockbottom?: boolean;
    player_danmaku_blockcolorful?: boolean;
    player_danmaku_blockrepeat?: boolean;
    player_danmaku_blockspecial?: boolean;
    player_danmaku_opacity?: number;
    player_danmaku_scalingfactor?: number;
    player_danmaku_domain?: number;
    player_danmaku_speed?: number;
    inline_player_danmaku_switch?: boolean;
    player_danmaku_senior_mode_switch?: number;
    player_danmaku_ai_recommended_level_v2?: number;
    player_danmaku_ai_recommended_level_v2_map?: {
        [key: number]: number;
    };
}
export declare function encodeDanmuDefaultPlayerConfig(message: DanmuDefaultPlayerConfig): Uint8Array;
export declare function decodeDanmuDefaultPlayerConfig(binary: Uint8Array): DanmuDefaultPlayerConfig;
export interface DanmuPlayerConfig {
    player_danmaku_switch?: boolean;
    player_danmaku_switch_save?: boolean;
    player_danmaku_use_default_config?: boolean;
    player_danmaku_ai_recommended_switch?: boolean;
    player_danmaku_ai_recommended_level?: number;
    player_danmaku_blocktop?: boolean;
    player_danmaku_blockscroll?: boolean;
    player_danmaku_blockbottom?: boolean;
    player_danmaku_blockcolorful?: boolean;
    player_danmaku_blockrepeat?: boolean;
    player_danmaku_blockspecial?: boolean;
    player_danmaku_opacity?: number;
    player_danmaku_scalingfactor?: number;
    player_danmaku_domain?: number;
    player_danmaku_speed?: number;
    player_danmaku_enableblocklist?: boolean;
    inline_player_danmaku_switch?: boolean;
    inline_player_danmaku_config?: number;
    player_danmaku_ios_switch_save?: number;
    player_danmaku_senior_mode_switch?: number;
    player_danmaku_ai_recommended_level_v2?: number;
    player_danmaku_ai_recommended_level_v2_map?: {
        [key: number]: number;
    };
}
export declare function encodeDanmuPlayerConfig(message: DanmuPlayerConfig): Uint8Array;
export declare function decodeDanmuPlayerConfig(binary: Uint8Array): DanmuPlayerConfig;
export interface DanmuPlayerConfigPanel {
    selection_text?: string;
}
export declare function encodeDanmuPlayerConfigPanel(message: DanmuPlayerConfigPanel): Uint8Array;
export declare function decodeDanmuPlayerConfigPanel(binary: Uint8Array): DanmuPlayerConfigPanel;
export interface DanmuPlayerDynamicConfig {
    progress?: number;
    player_danmaku_domain?: number;
}
export declare function encodeDanmuPlayerDynamicConfig(message: DanmuPlayerDynamicConfig): Uint8Array;
export declare function decodeDanmuPlayerDynamicConfig(binary: Uint8Array): DanmuPlayerDynamicConfig;
export interface DanmuPlayerViewConfig {
    danmuku_default_player_config?: DanmuDefaultPlayerConfig;
    danmuku_player_config?: DanmuPlayerConfig;
    danmuku_player_dynamic_config?: DanmuPlayerDynamicConfig[];
    danmuku_player_config_panel?: DanmuPlayerConfigPanel;
}
export declare function encodeDanmuPlayerViewConfig(message: DanmuPlayerViewConfig): Uint8Array;
export declare function decodeDanmuPlayerViewConfig(binary: Uint8Array): DanmuPlayerViewConfig;
export interface DanmuWebPlayerConfig {
    dm_switch?: boolean;
    ai_switch?: boolean;
    ai_level?: number;
    blocktop?: boolean;
    blockscroll?: boolean;
    blockbottom?: boolean;
    blockcolor?: boolean;
    blockspecial?: boolean;
    preventshade?: boolean;
    dmask?: boolean;
    opacity?: number;
    dmarea?: number;
    speedplus?: number;
    fontsize?: number;
    screensync?: boolean;
    speedsync?: boolean;
    fontfamily?: string;
    bold?: boolean;
    fontborder?: number;
    draw_type?: string;
    senior_mode_switch?: number;
    ai_level_v2?: number;
    ai_level_v2_map?: {
        [key: number]: number;
    };
}
export declare function encodeDanmuWebPlayerConfig(message: DanmuWebPlayerConfig): Uint8Array;
export declare function decodeDanmuWebPlayerConfig(binary: Uint8Array): DanmuWebPlayerConfig;
export interface DmColorful {
    type?: DmColorfulType;
    src?: string;
}
export declare function encodeDmColorful(message: DmColorful): Uint8Array;
export declare function decodeDmColorful(binary: Uint8Array): DmColorful;
export interface DmExpoReportReq {
    session_id?: string;
    oid?: Long;
    spmid?: string;
}
export declare function encodeDmExpoReportReq(message: DmExpoReportReq): Uint8Array;
export declare function decodeDmExpoReportReq(binary: Uint8Array): DmExpoReportReq;
export interface DmExpoReportRes {
}
export declare function encodeDmExpoReportRes(message: DmExpoReportRes): Uint8Array;
export declare function decodeDmExpoReportRes(binary: Uint8Array): DmExpoReportRes;
export interface DmPlayerConfigReq {
    ts?: Long;
    switch?: PlayerDanmakuSwitch;
    switch_save?: PlayerDanmakuSwitchSave;
    use_default_config?: PlayerDanmakuUseDefaultConfig;
    ai_recommended_switch?: PlayerDanmakuAiRecommendedSwitch;
    ai_recommended_level?: PlayerDanmakuAiRecommendedLevel;
    blocktop?: PlayerDanmakuBlocktop;
    blockscroll?: PlayerDanmakuBlockscroll;
    blockbottom?: PlayerDanmakuBlockbottom;
    blockcolorful?: PlayerDanmakuBlockcolorful;
    blockrepeat?: PlayerDanmakuBlockrepeat;
    blockspecial?: PlayerDanmakuBlockspecial;
    opacity?: PlayerDanmakuOpacity;
    scalingfactor?: PlayerDanmakuScalingfactor;
    domain?: PlayerDanmakuDomain;
    speed?: PlayerDanmakuSpeed;
    enableblocklist?: PlayerDanmakuEnableblocklist;
    inlinePlayerDanmakuSwitch?: InlinePlayerDanmakuSwitch;
    senior_mode_switch?: PlayerDanmakuSeniorModeSwitch;
    ai_recommended_level_v2?: PlayerDanmakuAiRecommendedLevelV2;
}
export declare function encodeDmPlayerConfigReq(message: DmPlayerConfigReq): Uint8Array;
export declare function decodeDmPlayerConfigReq(binary: Uint8Array): DmPlayerConfigReq;
export interface DmSegConfig {
    page_size?: Long;
    total?: Long;
}
export declare function encodeDmSegConfig(message: DmSegConfig): Uint8Array;
export declare function decodeDmSegConfig(binary: Uint8Array): DmSegConfig;
export interface DmSegMobileReply {
    elems?: DanmakuElem[];
    state?: number;
    ai_flag?: DanmakuAIFlag;
    colorfulSrc?: DmColorful[];
}
export declare function encodeDmSegMobileReply(message: DmSegMobileReply): Uint8Array;
export declare function decodeDmSegMobileReply(binary: Uint8Array): DmSegMobileReply;
export interface DmSegMobileReq {
    pid?: Long;
    oid?: Long;
    type?: number;
    segment_index?: Long;
    teenagers_mode?: number;
    ps?: Long;
    pe?: Long;
    pull_mode?: number;
    from_scene?: number;
}
export declare function encodeDmSegMobileReq(message: DmSegMobileReq): Uint8Array;
export declare function decodeDmSegMobileReq(binary: Uint8Array): DmSegMobileReq;
export interface DmSegOttReply {
    closed?: boolean;
    elems?: DanmakuElem[];
}
export declare function encodeDmSegOttReply(message: DmSegOttReply): Uint8Array;
export declare function decodeDmSegOttReply(binary: Uint8Array): DmSegOttReply;
export interface DmSegOttReq {
    pid?: Long;
    oid?: Long;
    type?: number;
    segment_index?: Long;
}
export declare function encodeDmSegOttReq(message: DmSegOttReq): Uint8Array;
export declare function decodeDmSegOttReq(binary: Uint8Array): DmSegOttReq;
export interface DmSegSDKReply {
    closed?: boolean;
    elems?: DanmakuElem[];
}
export declare function encodeDmSegSDKReply(message: DmSegSDKReply): Uint8Array;
export declare function decodeDmSegSDKReply(binary: Uint8Array): DmSegSDKReply;
export interface DmSegSDKReq {
    pid?: Long;
    oid?: Long;
    type?: number;
    segment_index?: Long;
}
export declare function encodeDmSegSDKReq(message: DmSegSDKReq): Uint8Array;
export declare function decodeDmSegSDKReq(binary: Uint8Array): DmSegSDKReq;
export interface DmViewReply {
    closed?: boolean;
    mask?: VideoMask;
    subtitle?: VideoSubtitle;
    special_dms?: string[];
    ai_flag?: DanmakuFlagConfig;
    player_config?: DanmuPlayerViewConfig;
    send_box_style?: number;
    allow?: boolean;
    check_box?: string;
    check_box_show_msg?: string;
    text_placeholder?: string;
    input_placeholder?: string;
    report_filter_content?: string[];
    expo_report?: ExpoReport;
    buzzword_config?: BuzzwordConfig;
    expressions?: Expressions[];
    post_panel?: PostPanel[];
    activity_meta?: string[];
    post_panel2?: PostPanelV2[];
}
export declare function encodeDmViewReply(message: DmViewReply): Uint8Array;
export declare function decodeDmViewReply(binary: Uint8Array): DmViewReply;
export interface DmViewReq {
    pid?: Long;
    oid?: Long;
    type?: number;
    spmid?: string;
    is_hard_boot?: number;
}
export declare function encodeDmViewReq(message: DmViewReq): Uint8Array;
export declare function decodeDmViewReq(binary: Uint8Array): DmViewReq;
export interface DmWebViewReply {
    state?: number;
    text?: string;
    text_side?: string;
    dm_sge?: DmSegConfig;
    flag?: DanmakuFlagConfig;
    special_dms?: string[];
    check_box?: boolean;
    count?: Long;
    commandDms?: CommandDm[];
    player_config?: DanmuWebPlayerConfig;
    report_filter_content?: string[];
    expressions?: Expressions[];
    post_panel?: PostPanel[];
    activity_meta?: string[];
}
export declare function encodeDmWebViewReply(message: DmWebViewReply): Uint8Array;
export declare function decodeDmWebViewReply(binary: Uint8Array): DmWebViewReply;
export interface ExpoReport {
    should_report_at_end?: boolean;
}
export declare function encodeExpoReport(message: ExpoReport): Uint8Array;
export declare function decodeExpoReport(binary: Uint8Array): ExpoReport;
export interface Expression {
    keyword?: string[];
    url?: string;
    period?: Period[];
}
export declare function encodeExpression(message: Expression): Uint8Array;
export declare function decodeExpression(binary: Uint8Array): Expression;
export interface Expressions {
    data?: Expression[];
}
export declare function encodeExpressions(message: Expressions): Uint8Array;
export declare function decodeExpressions(binary: Uint8Array): Expressions;
export interface InlinePlayerDanmakuSwitch {
    value?: boolean;
}
export declare function encodeInlinePlayerDanmakuSwitch(message: InlinePlayerDanmakuSwitch): Uint8Array;
export declare function decodeInlinePlayerDanmakuSwitch(binary: Uint8Array): InlinePlayerDanmakuSwitch;
export interface Label {
    title?: string;
    content?: string[];
}
export declare function encodeLabel(message: Label): Uint8Array;
export declare function decodeLabel(binary: Uint8Array): Label;
export interface LabelV2 {
    title?: string;
    content?: string[];
    exposure_once?: boolean;
    exposure_type?: number;
}
export declare function encodeLabelV2(message: LabelV2): Uint8Array;
export declare function decodeLabelV2(binary: Uint8Array): LabelV2;
export interface Period {
    start?: Long;
    end?: Long;
}
export declare function encodePeriod(message: Period): Uint8Array;
export declare function decodePeriod(binary: Uint8Array): Period;
export interface PlayerDanmakuAiRecommendedLevel {
    value?: boolean;
}
export declare function encodePlayerDanmakuAiRecommendedLevel(message: PlayerDanmakuAiRecommendedLevel): Uint8Array;
export declare function decodePlayerDanmakuAiRecommendedLevel(binary: Uint8Array): PlayerDanmakuAiRecommendedLevel;
export interface PlayerDanmakuAiRecommendedLevelV2 {
    value?: number;
}
export declare function encodePlayerDanmakuAiRecommendedLevelV2(message: PlayerDanmakuAiRecommendedLevelV2): Uint8Array;
export declare function decodePlayerDanmakuAiRecommendedLevelV2(binary: Uint8Array): PlayerDanmakuAiRecommendedLevelV2;
export interface PlayerDanmakuAiRecommendedSwitch {
    value?: boolean;
}
export declare function encodePlayerDanmakuAiRecommendedSwitch(message: PlayerDanmakuAiRecommendedSwitch): Uint8Array;
export declare function decodePlayerDanmakuAiRecommendedSwitch(binary: Uint8Array): PlayerDanmakuAiRecommendedSwitch;
export interface PlayerDanmakuBlockbottom {
    value?: boolean;
}
export declare function encodePlayerDanmakuBlockbottom(message: PlayerDanmakuBlockbottom): Uint8Array;
export declare function decodePlayerDanmakuBlockbottom(binary: Uint8Array): PlayerDanmakuBlockbottom;
export interface PlayerDanmakuBlockcolorful {
    value?: boolean;
}
export declare function encodePlayerDanmakuBlockcolorful(message: PlayerDanmakuBlockcolorful): Uint8Array;
export declare function decodePlayerDanmakuBlockcolorful(binary: Uint8Array): PlayerDanmakuBlockcolorful;
export interface PlayerDanmakuBlockrepeat {
    value?: boolean;
}
export declare function encodePlayerDanmakuBlockrepeat(message: PlayerDanmakuBlockrepeat): Uint8Array;
export declare function decodePlayerDanmakuBlockrepeat(binary: Uint8Array): PlayerDanmakuBlockrepeat;
export interface PlayerDanmakuBlockscroll {
    value?: boolean;
}
export declare function encodePlayerDanmakuBlockscroll(message: PlayerDanmakuBlockscroll): Uint8Array;
export declare function decodePlayerDanmakuBlockscroll(binary: Uint8Array): PlayerDanmakuBlockscroll;
export interface PlayerDanmakuBlockspecial {
    value?: boolean;
}
export declare function encodePlayerDanmakuBlockspecial(message: PlayerDanmakuBlockspecial): Uint8Array;
export declare function decodePlayerDanmakuBlockspecial(binary: Uint8Array): PlayerDanmakuBlockspecial;
export interface PlayerDanmakuBlocktop {
    value?: boolean;
}
export declare function encodePlayerDanmakuBlocktop(message: PlayerDanmakuBlocktop): Uint8Array;
export declare function decodePlayerDanmakuBlocktop(binary: Uint8Array): PlayerDanmakuBlocktop;
export interface PlayerDanmakuDomain {
    value?: number;
}
export declare function encodePlayerDanmakuDomain(message: PlayerDanmakuDomain): Uint8Array;
export declare function decodePlayerDanmakuDomain(binary: Uint8Array): PlayerDanmakuDomain;
export interface PlayerDanmakuEnableblocklist {
    value?: boolean;
}
export declare function encodePlayerDanmakuEnableblocklist(message: PlayerDanmakuEnableblocklist): Uint8Array;
export declare function decodePlayerDanmakuEnableblocklist(binary: Uint8Array): PlayerDanmakuEnableblocklist;
export interface PlayerDanmakuOpacity {
    value?: number;
}
export declare function encodePlayerDanmakuOpacity(message: PlayerDanmakuOpacity): Uint8Array;
export declare function decodePlayerDanmakuOpacity(binary: Uint8Array): PlayerDanmakuOpacity;
export interface PlayerDanmakuScalingfactor {
    value?: number;
}
export declare function encodePlayerDanmakuScalingfactor(message: PlayerDanmakuScalingfactor): Uint8Array;
export declare function decodePlayerDanmakuScalingfactor(binary: Uint8Array): PlayerDanmakuScalingfactor;
export interface PlayerDanmakuSeniorModeSwitch {
    value?: number;
}
export declare function encodePlayerDanmakuSeniorModeSwitch(message: PlayerDanmakuSeniorModeSwitch): Uint8Array;
export declare function decodePlayerDanmakuSeniorModeSwitch(binary: Uint8Array): PlayerDanmakuSeniorModeSwitch;
export interface PlayerDanmakuSpeed {
    value?: number;
}
export declare function encodePlayerDanmakuSpeed(message: PlayerDanmakuSpeed): Uint8Array;
export declare function decodePlayerDanmakuSpeed(binary: Uint8Array): PlayerDanmakuSpeed;
export interface PlayerDanmakuSwitch {
    value?: boolean;
    can_ignore?: boolean;
}
export declare function encodePlayerDanmakuSwitch(message: PlayerDanmakuSwitch): Uint8Array;
export declare function decodePlayerDanmakuSwitch(binary: Uint8Array): PlayerDanmakuSwitch;
export interface PlayerDanmakuSwitchSave {
    value?: boolean;
}
export declare function encodePlayerDanmakuSwitchSave(message: PlayerDanmakuSwitchSave): Uint8Array;
export declare function decodePlayerDanmakuSwitchSave(binary: Uint8Array): PlayerDanmakuSwitchSave;
export interface PlayerDanmakuUseDefaultConfig {
    value?: boolean;
}
export declare function encodePlayerDanmakuUseDefaultConfig(message: PlayerDanmakuUseDefaultConfig): Uint8Array;
export declare function decodePlayerDanmakuUseDefaultConfig(binary: Uint8Array): PlayerDanmakuUseDefaultConfig;
export interface PostPanel {
    start?: Long;
    end?: Long;
    priority?: Long;
    biz_id?: Long;
    biz_type?: PostPanelBizType;
    click_button?: ClickButton;
    text_input?: TextInput;
    check_box?: CheckBox;
    toast?: Toast;
}
export declare function encodePostPanel(message: PostPanel): Uint8Array;
export declare function decodePostPanel(binary: Uint8Array): PostPanel;
export interface PostPanelV2 {
    start?: Long;
    end?: Long;
    biz_type?: number;
    click_button?: ClickButtonV2;
    text_input?: TextInputV2;
    check_box?: CheckBoxV2;
    toast?: ToastV2;
    bubble?: BubbleV2;
    label?: LabelV2;
    post_status?: number;
}
export declare function encodePostPanelV2(message: PostPanelV2): Uint8Array;
export declare function decodePostPanelV2(binary: Uint8Array): PostPanelV2;
export interface Response {
    code?: number;
    message?: string;
}
export declare function encodeResponse(message: Response): Uint8Array;
export declare function decodeResponse(binary: Uint8Array): Response;
export interface SubtitleItem {
    id?: Long;
    id_str?: string;
    lan?: string;
    lan_doc?: string;
    subtitle_url?: string;
    author?: UserInfo;
    type?: SubtitleType;
    lan_doc_brief?: string;
    ai_type?: SubtitleAiType;
    ai_status?: SubtitleAiStatus;
}
export declare function encodeSubtitleItem(message: SubtitleItem): Uint8Array;
export declare function decodeSubtitleItem(binary: Uint8Array): SubtitleItem;
export interface TextInput {
    portrait_placeholder?: string[];
    landscape_placeholder?: string[];
    render_type?: RenderType;
    placeholder_post?: boolean;
    show?: boolean;
    avatar?: Avatar[];
    post_status?: PostStatus;
    label?: Label;
}
export declare function encodeTextInput(message: TextInput): Uint8Array;
export declare function decodeTextInput(binary: Uint8Array): TextInput;
export interface TextInputV2 {
    portrait_placeholder?: string[];
    landscape_placeholder?: string[];
    render_type?: RenderType;
    placeholder_post?: boolean;
    avatar?: Avatar[];
    text_input_limit?: number;
}
export declare function encodeTextInputV2(message: TextInputV2): Uint8Array;
export declare function decodeTextInputV2(binary: Uint8Array): TextInputV2;
export interface Toast {
    text?: string;
    duration?: number;
    show?: boolean;
    button?: Button;
}
export declare function encodeToast(message: Toast): Uint8Array;
export declare function decodeToast(binary: Uint8Array): Toast;
export interface ToastButtonV2 {
    text?: string;
    action?: number;
}
export declare function encodeToastButtonV2(message: ToastButtonV2): Uint8Array;
export declare function decodeToastButtonV2(binary: Uint8Array): ToastButtonV2;
export interface ToastV2 {
    text?: string;
    duration?: number;
    toast_button_v2?: ToastButtonV2;
}
export declare function encodeToastV2(message: ToastV2): Uint8Array;
export declare function decodeToastV2(binary: Uint8Array): ToastV2;
export interface UserInfo {
    mid?: Long;
    name?: string;
    sex?: string;
    face?: string;
    sign?: string;
    rank?: number;
}
export declare function encodeUserInfo(message: UserInfo): Uint8Array;
export declare function decodeUserInfo(binary: Uint8Array): UserInfo;
export interface VideoMask {
    cid?: Long;
    plat?: number;
    fps?: number;
    time?: Long;
    mask_url?: string;
}
export declare function encodeVideoMask(message: VideoMask): Uint8Array;
export declare function decodeVideoMask(binary: Uint8Array): VideoMask;
export interface VideoSubtitle {
    lan?: string;
    lanDoc?: string;
    subtitles?: SubtitleItem[];
}
export declare function encodeVideoSubtitle(message: VideoSubtitle): Uint8Array;
export declare function decodeVideoSubtitle(binary: Uint8Array): VideoSubtitle;
export interface Long {
    low: number;
    high: number;
    unsigned: boolean;
}
