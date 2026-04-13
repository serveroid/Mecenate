import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';

import { FeedScreen } from '../features/feed/screens/FeedScreen';
import { AppLoader } from '../shared/ui/AppLoader';
import { AppProviders, useRootStore } from './AppProviders';

const AppContent = observer(function AppContent() {
  const { sessionStore } = useRootStore();
  const [fontsLoaded] = useFonts({
    Manrope: require('../../assets/fonts/Manrope-Variable.ttf'),
  });

  useEffect(() => {
    void sessionStore.bootstrap();
  }, [sessionStore]);

  if (!fontsLoaded || !sessionStore.isReady || !sessionStore.sessionId) {
    return (
      <>
        <StatusBar style="dark" />
        <AppLoader
          subtitle="Создаём сессию и подключаем публикации авторов, на которых вы подписаны."
          title="Готовим ленту"
        />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <FeedScreen sessionId={sessionStore.sessionId} />
    </>
  );
});

export function AppRoot() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}
