/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_CAO_PORTAL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
