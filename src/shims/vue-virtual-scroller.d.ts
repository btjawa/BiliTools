declare module 'vue-virtual-scroller' {
  export interface PluginOptions {
    installComponent?: boolean;
    componentsPrefix?: string;
  }
  const plugin: {
    version: string;
    install: (app: App, options?: PluginOptions) => void;
  };
  export default plugin;

  // From https://github.com/Akryum/vue-virtual-scroller/issues/199#issuecomment-2005113856. Thanks for your hard-working!
  import {
    type ObjectEmitsOptions,
    type PublicProps,
    type SetupContext,
    type SlotsType,
    type VNode,
  } from 'vue';

  interface RecycleScrollerProps<T> {
    items: readonly T[];
    direction?: 'vertical' | 'horizontal';
    itemSize?: number | null;
    gridItems?: number;
    itemSecondarySize?: number;
    minItemSize?: number;
    sizeField?: string;
    typeField?: string;
    keyField?: keyof T;
    pageMode?: boolean;
    prerender?: number;
    buffer?: number;
    emitUpdate?: boolean;
    updateInterval?: number;
    listClass?: string;
    itemClass?: string;
    listTag?: string;
    itemTag?: string;
  }

  interface DynamicScrollerProps<T> extends RecycleScrollerProps<T> {
    minItemSize: number;
  }

  interface RecycleScrollerEmitOptions extends ObjectEmitsOptions {
    resize: () => void;
    visible: () => void;
    hidden: () => void;
    update: (
      startIndex: number,
      endIndex: number,
      visibleStartIndex: number,
      visibleEndIndex: number,
    ) => void;
    'scroll-start': () => void;
    'scroll-end': () => void;
  }

  interface RecycleScrollerSlotProps<T> {
    item: T;
    index: number;
    active: boolean;
  }

  interface RecycleScrollerSlots<T> {
    default(slotProps: RecycleScrollerSlotProps<T>): unknown;
    before(): unknown;
    empty(): unknown;
    after(): unknown;
  }

  export interface RecycleScrollerInstance {
    getScroll(): { start: number; end: number };
    scrollToItem(index: number): void;
    scrollToPosition(position: number): void;
  }

  export const RecycleScroller: <T>(
    props: RecycleScrollerProps<T> & PublicProps,
    ctx?: SetupContext<RecycleScrollerEmitOptions, SlotsType<RecycleScrollerSlots<T>>>,
    expose?: (exposed: RecycleScrollerInstance) => void,
  ) => VNode & {
    __ctx?: {
      props: RecycleScrollerProps<T> & PublicProps;
      expose(exposed: RecycleScrollerInstance): void;
      slots: RecycleScrollerSlots<T>;
    };
  };

  export const DynamicScroller: <T>(
    props: DynamicScrollerProps<T> & PublicProps,
    ctx?: SetupContext<RecycleScrollerEmitOptions, SlotsType<RecycleScrollerSlots<T>>>,
    expose?: (exposed: RecycleScrollerInstance) => void,
  ) => VNode & {
    __ctx?: {
      props: DynamicScrollerProps<T> & PublicProps;
      expose(exposed: RecycleScrollerInstance): void;
      slots: RecycleScrollerSlots<T>;
    };
  };

  interface DynamicScrollerItemProps<T> {
    item: T;
    active: boolean;
    sizeDependencies?: unknown[];
    watchData?: boolean;
    tag?: string;
    emitResize?: boolean;
    onResize?: () => void;
  }

  interface DynamicScrollerItemEmitOptions extends ObjectEmitsOptions {
    resize: () => void;
  }

  export const DynamicScrollerItem: <T>(
    props: DynamicScrollerItemProps<T> & PublicProps,
    ctx?: SetupContext<DynamicScrollerItemEmitOptions>,
  ) => VNode;

  export function IdState(options?: { idProp?: (value: any) => unknown }): ComponentOptionsMixin;
}