/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Authorized inquiry endpoint (POST JSON). When unset, the form hands off an email draft. */
  readonly VITE_INQUIRY_ENDPOINT?: string;
  /** Approved inquiry address for the email-draft handoff. Defaults to the address in the design. */
  readonly VITE_INQUIRY_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
