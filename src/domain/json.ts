export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

export type JsonObject = { [key: string]: JsonValue | undefined };

export function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
