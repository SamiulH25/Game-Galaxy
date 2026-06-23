/// <reference types="@sveltejs/kit" />

declare namespace App {
  // interface Error {}
  // interface Locals {}
  // interface PageData {}
  // interface Platform {}
}

interface AuthState {
  token: string | null;
  user: Record<string, any> | null;
}

interface Window {
  authState?: AuthState;
  __switchSystem?: (systemId: string) => Promise<void>;
  __gameSaveData?: () => any;
  __gameLoadData?: (data: any) => void;
  gameBridge?: {
    save: (data: any) => Promise<any>;
    load: () => Promise<any>;
  };
}
