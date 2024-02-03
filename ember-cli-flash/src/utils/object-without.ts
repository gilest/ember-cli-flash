export default function objectWithout(originalObj = {}, keysToRemove: string[] = []) {
  let newObj = {};

  for (let key in originalObj) {
    if (keysToRemove.includes(key)) continue;

    newObj[key] = originalObj[key];
  }

  return newObj;
}
