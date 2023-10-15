export default function objectWithout(originalObj: Record<string, any> = {}, keysToRemove: string[] = []) {
  let newObj = {};

  for (let key in originalObj) {
    if (keysToRemove.indexOf(key) === -1) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      newObj[key] = originalObj[key];
    }
  }

  return newObj;
}
