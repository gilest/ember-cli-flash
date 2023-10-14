export default function objectWithout(originalObj: Record<string, any> = {}, keysToRemain: string[] = []) {
  let newObj = {};

  for (let key in originalObj) {
    if (keysToRemain.includes(key)) {
      newObj[key] = originalObj[key];
    }
  }

  return newObj;
}
