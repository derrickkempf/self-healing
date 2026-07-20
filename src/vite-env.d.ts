/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_WHITELISTED_EMAILS?: string;
  /** Kit (ConvertKit) form ID — the numeric id in the form URL. */
  readonly VITE_KIT_FORM_ID?: string;
  /** Kit PUBLIC API key. NEVER put the API Secret here. */
  readonly VITE_KIT_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
