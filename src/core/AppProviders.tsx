import { QueryClientProvider } from '@tanstack/react-query';
import { createContext, type PropsWithChildren, useContext, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createQueryClient } from './queryClient';
import { createRootStore, type RootStore } from './rootStore';

const RootStoreContext = createContext<RootStore | null>(null);

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(createQueryClient);
  const [rootStore] = useState(createRootStore);

  return (
    <SafeAreaProvider>
      <RootStoreContext.Provider value={rootStore}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </RootStoreContext.Provider>
    </SafeAreaProvider>
  );
}

export function useRootStore() {
  const rootStore = useContext(RootStoreContext);

  if (!rootStore) {
    throw new Error('RootStoreProvider is missing');
  }

  return rootStore;
}
