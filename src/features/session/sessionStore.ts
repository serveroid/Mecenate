import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { makeAutoObservable, runInAction } from 'mobx';

const STORAGE_KEY = 'mecenate.session-id.v1';

type HydrationState = 'idle' | 'loading' | 'ready';

export class SessionStore {
  hydrationState: HydrationState = 'idle';
  sessionId: string | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get isReady() {
    return this.hydrationState === 'ready' && Boolean(this.sessionId);
  }

  async bootstrap() {
    if (this.hydrationState !== 'idle') {
      return;
    }

    this.hydrationState = 'loading';

    try {
      const persistedSessionId = await AsyncStorage.getItem(STORAGE_KEY);
      const hasValidPersistedSessionId =
        typeof persistedSessionId === 'string' && persistedSessionId.trim().length > 0;
      const sessionId = hasValidPersistedSessionId ? persistedSessionId : randomUUID();

      if (!hasValidPersistedSessionId) {
        await AsyncStorage.setItem(STORAGE_KEY, sessionId);
      }

      runInAction(() => {
        this.sessionId = sessionId;
        this.hydrationState = 'ready';
      });
    } catch {
      const fallbackSessionId = randomUUID();

      runInAction(() => {
        this.sessionId = fallbackSessionId;
        this.hydrationState = 'ready';
      });

      void AsyncStorage.setItem(STORAGE_KEY, fallbackSessionId).catch(() => undefined);
    }
  }
}
