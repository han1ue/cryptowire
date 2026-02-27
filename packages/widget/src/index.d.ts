export type WidgetMountOptions = {
  target: string | HTMLElement;
  baseUrl: string;
  apiBase?: string;
  sources?: string;
  limit?: number;
  theme?: "light" | "dark";
  title?: string;
  category?: string;
  minHeight?: number;
};

export type WidgetHandle = {
  iframe: HTMLIFrameElement;
  destroy(): void;
};

export declare const DEFAULTS: Readonly<{
  sources: string;
  limit: number;
  theme: string;
  title: string;
  minHeight: number;
}>;

export declare const POST_MESSAGE_TYPE: "cryptowire:widget:height";

export declare const normalizeBase: (raw: unknown) => string;

export declare const mount: (options: WidgetMountOptions) => WidgetHandle | null;

export declare const mountFromScript: (scriptEl: HTMLScriptElement) => WidgetHandle | null;

export declare const initFromScripts: (params?: { selector?: string }) => WidgetHandle[];
