declare module "vue-virtual-scroller" {
    import type { DefineComponent, App } from "vue";

    export interface PluginOptions {
        installComponent?: boolean;
        componentsPrefix?: string;
    }
    const plugin: {
        version: string;
        install: (app: App, options?: PluginOptions) => void;
    };
    export default plugin;

    // Reference https://github.com/Akryum/vue-virtual-scroller/issues/199#issuecomment-1762889915

    interface RecycleScrollerProps {
        items: any[];
        direction?: 'vertical' | 'horizontal';
        itemSize?: number | null;
        gridItems?: number;
        itemSecondarySize?: number;
        minItemSize?: number;
        sizeField?: string;
        typeField?: string;
        keyField?: string;
        pageMode?: boolean;
        prerender?: number;
        buffer?: number;
        emitUpdate?: boolean;
        updateInterval?: number;
        listClass?: string;
        itemClass?: string;
        listTag?: string;
        itemTag?: string;
    };

    interface RecycleScrollerComputed {
        sizes: Record<string, { accumulator: number; size?: number }> | [];
        simpleArray: boolean;
        itemIndexByKey: Record<string, number>;
    };

    interface RecycleScrollerMethods {
        getScroll(): { start: number; end: number; };
        scrollToItem(index: number): void;
        scrollToPosition(position: number): void;
    }

    type RecycleScrollerEmits = 'resize' | 'visible' | 'hidden' | 'update' | 'scroll-start' | 'scroll-end';

    interface RecycleScrollerInstance
    extends RecycleScrollerMethods,
      RecycleScrollerComputed {}

    export const RecycleScroller: DefineComponent<
        RecycleScrollerProps,
        {},
        {}, 
        RecycleScrollerComputed,
        RecycleScrollerMethods,
        ComponentOptionsMixin,
        ComponentOptionsMixin,
        RecycleScrollerEmits[]
    >;
}