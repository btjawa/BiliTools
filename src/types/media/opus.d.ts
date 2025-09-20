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
        paragraphs: Array<
          {
            align: 0 | 1 | 2;
          } & OpusContentPara
        >;
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
          url: string;
        }[];
        style: 2;
      };
    }
  | {
      para_type: 3;
      line: {
        pic: {
          url: string;
        };
      };
    }
  | {
      para_type: 4;
      text: {
        nodes: OpusContentNode[];
      };
    }
  | {
      para_type: 5;
      list: {
        items: {
          level: number;
          order: number;
          nodes: OpusContentNode[];
        }[];
        style: 1 | 2;
      };
    }
  | {
      para_type: 6;
      link_card: {
        card: {
          oid: string;
          opus: {
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
      rich: {
        orig_text: string;
        text: string;
        style?: {
          font_level: string;
          font_size: 17 | 24;
        };
      } & OpusContentRich;
    };

type OpusContentRich =
  | {
      jump_url?: string;
      type: 'RICH_TEXT_NODE_TYPE_WEB';
    }
  | {
      rid: string;
      type: 'RICH_TEXT_NODE_TYPE_AT';
    }
  | {
      jump_url?: string;
      rid: string;
      type: 'RICH_TEXT_NODE_TYPE_BV';
    }
  | {
      rid: string;
      type: 'RICH_TEXT_NODE_TYPE_LOTTERY';
    }
  | {
      jump_url?: string;
      type: 'RICH_TEXT_NODE_TYPE_TOPIC';
    }
  | {
      jump_url?: string;
      rid: string;
      type: 'RICH_TEXT_NODE_TYPE_GOODS';
    }
  | {
      emoji: {
        icon_url: string;
        text: string;
      };
      type: 'RICH_TEXT_NODE_TYPE_EMOJI';
    }
  | {
      rid: string;
      type: 'RICH_TEXT_NODE_TYPE_VOTE';
    };
