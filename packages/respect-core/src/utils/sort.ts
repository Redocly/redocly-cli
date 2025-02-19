const methodCompareMap = {
  post: 0,
  put: 1,
  get: 2,
  patch: 3,
  delete: 4,
  head: 5,
  options: 6,
  trace: 7,
  connect: 8,
  query: 9,
};

function getKeyWeigh(keyMap: Record<string, number>, key: string): number {
  const uniqueKeyMap = new Map(Object.entries(keyMap));
  const ketToReturn = uniqueKeyMap.get(key.toLowerCase());
  return ketToReturn ? ketToReturn : -1;
}

function sortKeys(a: string, b: string, compareMap: Record<string, number>): number {
  const aKeyWeight = getKeyWeigh(compareMap, a);
  const bKeyWeight = getKeyWeigh(compareMap, b);
  return aKeyWeight - bKeyWeight;
}

export function sortMethods(a: string, b: string) {
  return sortKeys(a, b, methodCompareMap);
}
