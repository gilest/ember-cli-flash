export default function objectWithout(originalObj: Record<string, any> = {}, keysToRemove: string[] = []) {
  let newObj = {};

  for (let key in originalObj) {
    if (keysToRemove.indexOf(key) === -1) {
      newObj[key] = originalObj[key];
    }
  }

  return newObj;
}
