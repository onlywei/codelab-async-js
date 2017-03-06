function adder(initialValue) {
  let state = 'initial';
  let done = false;
  let sum = initialValue;

  function go(input) {
    let result;

    switch (state) {
      case 'initial':
        result = initialValue;
        state = 'loop';
        break;
      case 'loop':
        sum += input;
        result = sum;
        state = 'loop';
        break;
      default:
        break;
    }

    return {done: done, value: result};
  }

  return {
    next: go
  }
}

function runner() {
  const add = adder(0);
  console.log(add.next()); // 0
  console.log(add.next(1)); // 1
  console.log(add.next(2)); // 3
  console.log(add.throw(new Error('BOO)!'))); // 1
  console.log(add.next(4)); // 5
}

runner();
