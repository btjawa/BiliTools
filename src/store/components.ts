import { defineStore } from 'pinia';
import { ShallowReactive, shallowReactive, ShallowRef, watch } from 'vue';

import { Filter as HistoryFilter } from '@/components/HistoryPage';
import { Popup as SelectPopup } from '@/components/SearchPage';
import { Popup as TaskPopup } from '@/components/DownPage';
import { Updater, LinkDropper } from '@/components';

import router, { routes } from '@/router';

export const componentMap = {
  historyFilter: HistoryFilter,
  selectPopup: SelectPopup,
  taskPopup: TaskPopup,
  updater: Updater,
  linkDropper: LinkDropper,
} as const;

type ComponentRefs = {
  [K in keyof typeof componentMap]:
    | ShallowRef<InstanceType<(typeof componentMap)[K]>>
    | undefined;
};

export const routeMap = Object.fromEntries(
  routes.map((r) => [r.name, r.component]),
) as {
  [R in (typeof routes)[number] as R['name']]: R['component'];
};

type RouteRefs = {
  [K in keyof typeof routeMap]:
    | ShallowRef<InstanceType<(typeof routeMap)[K]>>
    | undefined;
};

export const useComponentsStore = defineStore('components', () => {
  const _c = shallowReactive({} as ComponentRefs);
  const _r = shallowReactive({} as RouteRefs);

  function regComponent<K extends keyof ComponentRefs>(
    name: K,
    instance: ComponentRefs[K],
  ) {
    if (_c[name]) return;
    _c[name] = instance;
  }

  function regRoute<K extends keyof RouteRefs>(
    name: K,
    instance: RouteRefs[K],
  ) {
    if (_r[name]) return;
    _r[name] = instance;
  }

  async function navigate<K extends keyof RouteRefs>(
    name: K,
  ): Promise<NonNullable<RouteRefs[K]>['value']> {
    const ref = _r[name] as RouteRefs[K];
    await router.push({ name });
    return new Promise((resolve) => {
      const stop = watch(
        () => ref?.value,
        (v) => {
          if (v) {
            stop();
            resolve(v);
          }
        },
        { immediate: true },
      );
    });
  }

  const c = new Proxy(_c, {
    get(target, k: keyof typeof componentMap) {
      const ref = target[k];
      if (!ref || typeof ref !== 'object') return undefined;

      return new Proxy(ref, {
        get(t, p) {
          if (!t.value) return undefined;
          return Reflect.get(t.value, p);
        },
      });
    },
  }) as unknown as ShallowReactive<{
    [K in keyof typeof componentMap]:
      | InstanceType<(typeof componentMap)[K]>
      | undefined;
  }>;

  const r = new Proxy(_r, {
    get(target, k: keyof typeof routeMap) {
      const ref = target[k];
      if (!ref || typeof ref !== 'object') return undefined;

      return new Proxy(ref, {
        get(t, p) {
          if (!t.value) return undefined;
          return Reflect.get(t.value, p);
        },
      });
    },
  }) as unknown as ShallowReactive<{
    [K in keyof typeof routeMap]:
      | InstanceType<(typeof routeMap)[K]>
      | undefined;
  }>;

  return {
    c,
    r,
    navigate,
    regComponent,
    regRoute,
  };
});
