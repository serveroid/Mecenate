# Mecenate Feed

Тестовое задание для Mecenate: экран ленты публикаций на `React Native + Expo + TypeScript`.

## Что реализовано

- лента публикаций с аватаром автора, обложкой, превью, лайками и комментариями
- курсорная пагинация через `useInfiniteQuery`
- `pull-to-refresh`
- заглушка для `paid` постов
- отдельный error-state с кнопкой повтора
- дизайн-токены, разделение на feature-слои и MobX store для клиентской сессии

## Стек

- Expo SDK 54
- React Native 0.81
- TypeScript
- MobX
- React Query

## Запуск

```bash
yarn install
cp .env.example .env
yarn start
```

Дальше можно открыть проект через Expo Go или запустить:

```bash
yarn ios
yarn android
```

Проект настроен под `Yarn 4` с `node-modules` linker, чтобы Expo/Metro не ломались на PnP/Babel peer dependencies.

## Переменные окружения

- `EXPO_PUBLIC_MECENATE_API_URL` — базовый URL API
- `EXPO_PUBLIC_MECENATE_SIMULATE_ERROR` — если поставить `1`, экран будет запрашивать `/posts?simulate_error=true` и можно быстро проверить error-state

## Проверки

```bash
yarn lint
yarn typecheck
```

## Архитектура

- `src/core` — composition root, providers, query client
- `src/features/session` — MobX store для UUID-сессии пользователя
- `src/features/feed` — API, модели, hooks и UI ленты
- `src/shared` — токены, UI primitives и утилиты
