/**
 * This file is meant to be a scratch pad. Tinker here, and run `node scratch.js` to see the
 * results.
 */
function* counts(start) {
  yield start + 1;
  yield start + 2;
  yield start + 3;
  return start + 4;
}

const counter = counts(0);
console.log(counter.next()); // {value: 1, done: false}
console.log(counter.next()); // {value: 2, done: false}
console.log(counter.next()); // {value: 3, done: false}
console.log(counter.next()); // {value: 4, done: true}
console.log(counter.next()); // {value: undefined, done: true}
