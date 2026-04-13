import { SessionStore } from '../features/session/sessionStore';

export type RootStore = {
  sessionStore: SessionStore;
};

export function createRootStore(): RootStore {
  return {
    sessionStore: new SessionStore(),
  };
}
