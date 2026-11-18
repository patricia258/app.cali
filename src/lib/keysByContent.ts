export function keysByContent<T>(items: readonly T[], identify: (item: T) => string) {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const content = identify(item);
    const occurrence = seen.get(content) ?? 0;
    seen.set(content, occurrence + 1);
    return { item, key: JSON.stringify([content, occurrence]) };
  });
}
