function adder(initialValue) {
  let state = 'initial';
  let done = false;
  let sum = initialValue;
  let lastSum;
  let temp;

  function go(input, err) {
    let result;

    switch (state) {
      case 'initial':
        if (err) {
          throw err;
        }
        temp = sum;
        result = initialValue;
        state = 'loop';
        break;
      case 'loop':
        try {
          if (err) {
            throw err;
          }
          sum += input;
          lastSum = temp;
          temp = sum;
        } catch (e) {
          sum = lastSum;
        }
        result = sum;
        state = 'loop';
        break;
      default:
        break;
    }

    return {done: done, value: result};
  }

  return {
    next: go,
    throw: function (err) {
      return go(undefined, err)
    }
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
