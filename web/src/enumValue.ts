export function findEnumValue<T extends string>(values: readonly T[], candidate: string): T | undefined {
  return values.find((value) => value === candidate);
}
