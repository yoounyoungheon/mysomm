export const CUSTOM_FOOD_MAX_LENGTH = 100;

export function validateCustomFood(
  raw: string,
  existingNames: readonly string[],
) {
  const name = raw.trim();
  if (!name) return { name, error: "음식 이름을 입력해 주세요." };
  if (name.length > CUSTOM_FOOD_MAX_LENGTH)
    return { name, error: "음식 이름은 100자 이내로 입력해 주세요." };
  if (existingNames.includes(name))
    return { name, error: "이미 목록에 있는 음식이에요." };
  return { name, error: null };
}

export function getMenuSelection(
  selectedNames: readonly string[],
  availableNames: readonly string[],
) {
  const available = new Set(availableNames);
  const names = [...new Set(selectedNames)].filter((name) =>
    available.has(name),
  );
  return {
    names,
    canRequestPairing: names.length > 0,
  };
}
