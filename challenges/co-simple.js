function deferred(val) {
  return new Promise((resolve, reject) => resolve(val));
}

co(function* asyncAdds() {
  console.log(yield deferred(1));
  console.log(yield deferred(2));
  console.log(yield deferred(3));
});

function co(generator) {
  return new Promise((resolve, reject) => {
    // Your code goes here
  });
}
