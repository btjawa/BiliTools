export class Go {
    argv: string[];
    env: Record<string, string>;
    exit: (code: number) => void;
    exited: boolean;
    importObject: WebAssembly.Imports;
    mem: DataView;
    _inst: WebAssembly.Instance | null;
    _values: any[];
    _goRefCounts: number[];
    _ids: Map<any, number>;
    _idPool: number[];
    _exitPromise: Promise<void>;
    _resolveExitPromise: () => void;
    _pendingEvent: { id: number; this: any; args: IArguments } | null;
    _scheduledTimeouts: Map<number, NodeJS.Timeout>;
    _nextCallbackTimeoutID: number;

    constructor();

    run(instance: WebAssembly.Instance): Promise<void>;
    _resume(): void;
    _makeFuncWrapper(id: number): (...args: any[]) => any;
}