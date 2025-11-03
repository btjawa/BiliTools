export interface OpusResp {
  id: string;
  detail: {
    modules: OpusModule[];
  };
}

type OpusModule =
  | {
      module_top: {
        display: {
          album: {
            pics: {
              url: string;
            }[];
          };
        };
      };
      module_type: 'MODULE_TYPE_TOP';
    }
  | {
      module_title: {
        text: string;
      };
      module_type: 'MODULE_TYPE_TITLE';
    }
  | {
      module_author: {
        face: string;
        name: string;
        mid: number;
        pub_ts: number;
      };
      module_type: 'MODULE_TYPE_AUTHOR';
    }
  | {
      module_content: {
        paragraphs: OpusContentParas[];
      };
      module_type: 'MODULE_TYPE_CONTENT';
    }
  | {
      module_stat: {
        coin: {
          count: number;
        };
        comment: {
          count: number;
        };
        favorite: {
          count: number;
        };
        forward: {
          count: number;
        };
        like: {
          count: number;
        };
      };
      module_type: 'MODULE_TYPE_STAT';
    };

type OpusContentParas = {
  format?: {
    align: 0 | 1 | 2;
    indent: null;
  };
} & OpusContentPara;

type OpusContentPara =
  | {
      para_type: 1;
      text: {
        nodes: OpusContentNode[];
      };
    }
  | {
      para_type: 2;
      pic: {
        pics: {
          height: number;
          url: string;
        }[];
        style: 2;
      };
    }
  | {
      para_type: 3;
      line: {
        pic: {
          height: number;
          url: string;
        };
      };
    }
  | {
      para_type: 4;
      blockquote: {
        children: OpusContentParas[];
      };
    }
  | {
      para_type: 5;
      list: {
        children: {
          level: number;
          order: number;
          children: OpusContentParas[];
        }[];
        style: 1 | 2;
      };
    }
  | {
      para_type: 6;
      link_card: {
        card: {
          oid: string;
          item_null?: {
            text: string;
          };
          opus?: {
            author: {
              mid: number;
              name: string;
            };
            cover: string;
            jump_url: string;
            stat: {
              view: number;
            };
            title: string;
          };
        };
      };
    };

type OpusContentNode =
  | {
      type: 'TEXT_NODE_TYPE_WORD';
      word: {
        color?: string;
        font_size?: 17 | 24;
        style?: {
          bold: boolean;
        };
        words: string;
      };
    }
  | {
      type: 'TEXT_NODE_TYPE_RICH';
      rich: OpusRichNode;
    };

export type OpusRichNode = {
  orig_text: string;
  text: string;
  style?: {
    font_level: 'regular';
    font_size: 17 | 24;
  };
} & OpusContentRich;

type OpusContentRich =
  | {
      rid: string;
      type: 'RICH_TEXT_NODE_TYPE_AT';
    }
  | {
      jump_url: string;
      rid: string;
      type: 'RICH_TEXT_NODE_TYPE_BV';
    }
  | {
      emoji: {
        icon_url: string;
        text: string;
      };
      type: 'RICH_TEXT_NODE_TYPE_EMOJI';
    }
  | {
      goods: {
        jump_url: string;
      };
      type: 'RICH_TEXT_NODE_TYPE_GOODS';
    }
  | {
      rid: string;
      type: 'RICH_TEXT_NODE_TYPE_LOTTERY';
    }
  | {
      type: 'RICH_TEXT_NODE_TYPE_TEXT';
    }
  | {
      jump_url: string;
      type: 'RICH_TEXT_NODE_TYPE_TOPIC';
    }
  | {
      rid: string;
      type: 'RICH_TEXT_NODE_TYPE_VOTE';
    }
  | {
      jump_url: string;
      type: 'RICH_TEXT_NODE_TYPE_WEB';
    };
