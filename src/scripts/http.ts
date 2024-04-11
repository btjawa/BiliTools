import { invoke } from '@tauri-apps/api/core';

export interface ClientOptions {
    maxRedirections?: number;
    connectTimeout?: number;
}

export async function fetch(input: URL | Request | string, options?: RequestInit & ClientOptions): Promise<Response> {
    const maxRedirections = options?.maxRedirections;
    const connectTimeout = options?.connectTimeout;
    if (options) {
        delete options.maxRedirections;
        delete options.connectTimeout;
    }
    const headers = !options?.headers
        ? []
        : options.headers instanceof Headers
            ? Array.from(options.headers.entries())
            : Array.isArray(options.headers)
                ? options.headers
                : Object.entries(options.headers);
    const mappedHeaders = headers.map(([name, val]) => [
        name,
        typeof val === "string" ? val : val as string,
    ]);
    const req = new Request(input, options);
    const buffer = await req.arrayBuffer();
    const reqData = buffer.byteLength ? Array.from(new Uint8Array(buffer)) : null;
    let clientConfig = {
        method: req.method,
        url: req.url,
        headers: mappedHeaders,
        data: reqData,
        maxRedirections,
        connectTimeout,
    }
    const loadingBox = document.querySelector('.loading');
    if (loadingBox) loadingBox.classList.add('active');
    const { status, statusText, url, headers: responseHeaders, body } = await invoke("fetch", {
        clientConfig,
    }) as any;
    if (loadingBox) loadingBox.classList.remove('active');
    const res = new Response(body instanceof ArrayBuffer && body.byteLength
        ? body
        : body instanceof Array && body.length
            ? new Uint8Array(body)
            : null, {
        headers: responseHeaders,
        status,
        statusText,
    });
    Object.defineProperty(res, "url", { value: url });
    return res;
}