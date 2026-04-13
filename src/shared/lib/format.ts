const compactNumberFormatter = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 1,
  notation: 'compact',
});

const feedDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
});

export function formatCompactNumber(value: number) {
  return compactNumberFormatter.format(value);
}

export function formatFeedDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'сейчас';
  }

  return feedDateFormatter.format(date);
}
