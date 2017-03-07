## Demystifying Async Programming in Javascript

Asynchronous programming in Javascript has undergone several evolutions, from callbacks to promises
to generators, and soon to async/await. While each evolution has made async programming a little bit
easier for those knee-deep in Javascript, it has made it rather intimidating to those new to all the
little nuances of each paradigm to understand how to apply each, and just as importantly, how it all
works.

The goal of this codelab is to review usage of callbacks and promises, give a quick intro to
generators, and then provide an intuitive understanding of how async programming with generators
and async/await actually work under the hood, so that you can confidently apply the different
paradigms in the right places.

It assumes that you've already used callbacks, promises, and generators before for async
programming, and that you are fairly familiar with Javascript closures and currying.

## Callback hell

Callbacks is where it all started. Javascript doesn't have synchronous I/O, and doesn't support
blocking in general, so to do any type of I/O, or to defer any action, the strategy to run code
asynchronously was to pass in a function to be called later, triggered somewhere down the event
loop. A single callback isn't too bad, but code grows and callbacks usually lead to more and more
callbacks calling other callbacks. It ends up looking something like this:

```javascript
getUserData(function doStuff(e, a) {
  getMoreUserData(function doMoreStuff(e, b) {
    getEvenMoreUserData(function doEvenMoreStuff(e, c) {
      getYetMoreUserData(function doYetMoreStuff(e, c) {
        console.log('Welcome to callback hell!');
      });
    });
  });
})
```

Aside from the goosebumps from looking at code that keeps nesting on itself, you also have now
deferred control of your `do*Stuff` logic to other functions (`get*UserData()`) that you may or may
not have the source code to, and you can't really tell if they'll invoke your callback. Great isn't
it?

## Promises

Promises un-invert the inversion of control that callbacks provide, and let you untangle the
callback hell into a flat chain.

The last example can now be converted into something like:

```javascript
getUserData()
  .then(getUserData)
  .then(doMoreStuff)
  .then(getEvenMoreUserData)
  .then(doEvenMoreStuff)
  .then(getYetMoreUserData)
  .then(doYetMoreStuff);
```

Not too shabby eh?

But wait!! Let's look at a more practical (but still very contrived) example of callbacks:

```javascript
// Suppose that we have a method fetch() that does GET requests and has an interface that looks like
// this, where callback is expected to take error as its first argument and the parsed response data
// as its second.
function fetch(url, callback) { ... }

fetch('/api/user/self', function(e, user) {
  fetch('/api/interests?userId=' + user.id, function(e, interests) {
    var recommendations = [];
    interests.forEach(function () {
      fetch('/api/recommendations?topic=' + interest, function(e, recommendation) {
        recommendations.push(recommendation);
        if (recommendations.length == interests.length) {
          render(profile, interests, recommendations);
        }
      });
    });
  });
});
```

So we fetch a user's profile, then fetch the interests, then based on the interests we fetch
recommendations, and then when we get all the recommendations we render the page. A set of callbacks
you can be proud of, though it's definitely getting hairy. But promises will make it all better!
Right?

Let's assume that we have a new version of fetch that returns a promise and resolves it with the
response body.
```javascript
fetch('/api/user/self')
    .then(function (user) {
        return fetch('/api/user/interests?userId=' + self.id);
    })
    .then(function (interests) {
        return Promise.all[interests.map(i => fetch('/api/recommendations?topic=' + i))];
    })
    .then(function (recommendations) {
        render(user, interests, recommendations);
    });
```

Beautiful, right? See what's wrong with the code yet?

............................Ooops!.........................

We don't have access to profile or interests in the last function in the chain!? So it doesn't work!
What can we do? Well, we can nest promises:

```javascript
fetch('/api/user/self')
    .then(function (user) {
      return fetch('/api/user/interests?userId=' + self.id)
          .then(interests => {
            user: user,
            interests: interests
          });
    })
    .then(function (blob) {
      return Promise.all[blob.interests.map(i => fetch('/api/recommendations?topic=' + i))]
          .then(recommendations => {
            user: blob.user,
            interests: blob.interests,
            recommendations: recommendations
          });
    })
    .then(function (bigBlob) {
      render(bigBlob.user, bigBlob.interests, bigBlob.recommendations);
    });
```

Well... now that's a lot uglier than we were hoping for. Isn't this nesting craziness one of the
reasons we wanted to get out of callback hell? What now?

So we can actually make this a bit prettier by leveraging closures:

```javascript
// We declare these variables we want to save ahead of time.
var user, recommendations;

fetch('/api/user/self')
    .then(function (fetchedUser) {
      user = fetchedUser;

      return fetch('/api/user/interests?userId=' + self.id);
    })
    .then(function (fetchedInterests) {
      interests = fetchedInterests;

      return Promise.all(interests.map(i => fetch('/api/recommendations?topic=' + i)));
    })
    .then(function (recomendations) {
      render(user, interests, recommendations);
    })
    .then(function () {
      console.log('We are done!');
    });
```

Well, this is almost as good as what we wanted, with a little quirk. Notice how we called the
arguments inside the promise callbacks `fetchedUser` and `fetchedInterests` instead of `user` and
`interests`? If you did, you are pretty observant!

The flaw with this approach is that you have to be *very very* careful not to name anything inside
the inner functions the same as the "cache" variables you want to use in your closure. If you give
one the same name, then it will shadow the variable from the closure. Even if you manage be careful
enough to avoid shadowing, referring to variable so far up the closure can still be kind of
dangerous and is definitely icky.


## Async Generators

Generators to the rescue! If we use generators, we can make all of the ickiness go away. It's magic.
Really. Believe me. Just look:

```javascript
co(function* () {
  var user = yield fetch('/api/user/self');
  var interests = yield fetch('/api/user/interests?userId=' + self.id);
  var recommendations = yield Promise.all(
      interests.map(i => fetch('/api/recommendations?topic=' + i)));
  render(user, interests, recommendations);
});
```

That's it. It'll work. Are you tearing up at the beauty of generators and regretting that you
actually were reckless enough to learn Javascript before it had generators yet? I know I did at one
point.

But... how does it all work? Is it really magic?

Of course!...................... Not. Let's burst the illusion.

## Generators

Generators look simple to use in our example, but there's actually a lot going on here. To dive
deeper on async generators, we'll need a better understanding of how generators behave and how it
enables synchronous-looking async operations.

A generator, well, generates values:

```javascript
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
```

This is pretty straightforward, but let's talk through what's going on anyways:

1. `const counter = counts();` - Initialize the generator and save it to the `counter` variable. The
   generator is in the suspended state and no code inside the generator body has yet been executed.
2. `console.log(counter.next());` - The yield 1 is evaluated, and 1 is returned as the `value`, and
   `done` is false because there's more yielding to be done
3. `console.log(counter.next());` - Next up is 2!
4. `console.log(counter.next());` - Next up is 3! And we are at the end. Done right? No. Execution
   pauses at yield 3; We need to call `next()` again to finish.
5. `console.log(counter.next());` - Next up is 4, and it's returned instead of yielded, so we exit
   and are done.
6. `console.log(counter.next());` - The generator is already done! It's got nothing to say other
   than that it's done.

We understand how generators work now! But wait, shocking truth: generators don't just spit out
values, they can eat them too!

```javascript
function* printer() {
  console.log("We are starting!");
  console.log(yield);
  console.log(yield);
  console.log(yield);
  console.log("We are done!");
}

const counter = printer();
counter.next(1); // We are starting!
counter.next(2); // 2
counter.next(3); // 3
counter.next(4); // 4\n We are done!
counter.next(5); // <doesn't print anything>
```

Woah, what?! The generator is consuming values instead of generating them. How is this possible?

The secret is the `next` function. It not only returns values from the generator, but can send
values back into the generator. When `next()` is given an argument, the `yield` that the generator
is currently waiting on is actually evaluated into the argument. This is why the first
`counter.next(1)` logged `undefined`. There's no `yield` to resolve yet.

It's as if generators let the caller code (routine) and the generator code (routine) work together
as partners, passing values back and forth to each other as they execute and wait on each other.
It's almost as if generators in Javascript were designed for you to be able to implement cooperative
concurrently executing routines, or "co-routines". Hey! that looks kinda like `co()` doesn't it?

But let's not be too clever and get ahead of ourselves yet. This exercise is about building
intuition about generators and asynchronous programming, and what better way to build intuition
about generators, than to build a generator? Not write a generator function, or use one, but build
the internals of a generator function.

## Generator internals - generating generators

Okay, I actually don't know what the generator internals look like in the various JS runtimes. But
it doesn't really matter. Generators follow an interface. A "constructor" to instantiate the
generator, a `next(value? : any)` method to tell the generator to continue and give it values, and a
`throw(error)` method give it an error instead of a `value` and `return()` method that we'll gloss
over. If we can satisfy the interface, we are good.

So, let's try building the `counts()` generator up above, and write it using ES5 without the
`function*` keyword. We can ignore `throw()` and passing `value` into `next()` for now, since it
doesn't take any input. How do we do it?

Well, there's actually another means of pausing and continuing program execution in Javascript:
closures! Does this look familiar?

```javascript
function makeCounter() {
  var count = 1;
  return function () {
    return count++;
  }
}

var counter = makeCounter();
console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3
```

If you've used closures before, I'm sure you've written something similar in the past. The function
returned by `makeCounter` can _generate_ an infinite series of numbers, just like a _generator_.

But, this function doesn't abide by the generator interface, and isn't directly applicable to our
`counts()` example, which returns 4 values and exits. How do we apply a general approach to writing
generator-like functions?

Closures, state machines, and elbow grease!

```javascript
function counts(start) {
  let state = 0;
  let done = false;

  function go() {
    let result;

    switch (state) {
      case 0:
        result = start + 1;
        state = 1;
        break;
      case 1:
        result = start + 2;
        state = 2;
        break;
      case 2:
        result = start + 3;
        state = 3;
        break;
      case 3:
        result = start + 4;
        done = true;
        state = -1;
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

const counter = counts(0);
console.log(counter.next()); // {value: 1, done: false}
console.log(counter.next()); // {value: 2, done: false}
console.log(counter.next()); // {value: 3, done: false}
console.log(counter.next()); // {value: 4, done: true}
console.log(counter.next()); // {value: undefined, done: true}
```

If you run this, you'll see that we get the same results as the generator version. Neat right?

Okay, now that we have deconstructed the generator-as-producer, how do we go about implementing the
generator-as-consumer?

It's actually not too different.

```javascript
function printer(start) {
  let state = 0;
  let done = false;

  function go(input) {
    let result;

    switch (state) {
      case 0:
        console.log("We are starting!");
        state = 1;
        break;
      case 1:
        console.log(input);
        state = 2;
        break;
      case 2:
        console.log(input);
        state = 3;
        break;
      case 3:
        console.log(input);
        console.log("We are done!");
        done = true;
        state = -1;
        break;
      default:
        break;

      return {done: done, value: result};
    }
  }

  return {
    next: go
  }
}

const counter = printer();
counter.next(1); // We are starting!
counter.next(2); // 2
counter.next(3); // 3
counter.next(4); // 4
counter.next(5); // We are done!
```

All we had to do was to add `input` as an argument to `go`, and the values got piped through. Kind
of magical right? Almost as magical as generators?

Yay! Now we've made a generator-as-producer and a generator-as-consumer. Why don't we try building a
generator-as-producer-and-consumer? Here's another contrived generator:

```javascript
function* adder(initialValue) {
  let sum = initialValue;
  while (true) {
    sum += yield sum;
  }
}
```

Since we are generator gurus now, we understand that this generator adds the value provided in
`next(value)` to the `sum`, and returns the `sum`. And it behaves just like we'd expect:

```javascript
const add = adder(0);
console.log(add.next()); // 0
console.log(add.next(1)); // 1
console.log(add.next(2)); // 3
console.log(add.next(3)); // 6
```

Cool. Now let's build it this interface as a regular function!

```javascript
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
  console.log(add.next(3)); // 6
}

runner();
```

Whew, we've implemented a bonafide co-routine. The `runner()` the `adder()` gives the `adder()`
values, `adder()` adds and returns the sum, and then `runner()` prints the sum and gives `adder()` a
new value to add.

There's one more little bit to cover with generators. How do exceptions work? Well, exceptions that
occur inside the generators are easy: `next()` will propagate the exception to the caller, and the
generator dies. Relaying an exception to a generator relies on the `throw()` method we glossed over.

Let's give our adder a crazy new feature. If an exception is relayed to the generator by the caller,
it will revert to the last value of the sum.

```javascript
function* adder(initialValue) {
  let sum = initialValue;
  let lastSum = initialValue;
  let temp;
  while (true) {
    try {
      temp = sum;
      sum += yield sum;
      lastSum = temp;
    } catch (e) {
      sum = lastSum;
    }
  }
}

const add = adder(0);
console.log(add.next()); // 0
console.log(add.next(1)); // 1
console.log(add.next(2)); // 3
console.log(add.throw(new Error('BOO)!'))); // 1
console.log(add.next(4)); // 5
```

### Coding challenge - Generator error propagation

Oh boy, how do we implement `throw()`?

Simple! An error is just another value. We can just pass it into `go()` as another argument. Note
that we actually have to be a little careful here. When `throw(e)` is called, the `yield` inside the
generator will have the same effect as if it were written as `throw e`. This means that we actually
should be checking for error in _every_ state in our state machine, and failing if we can't handle
it.

Let's start with the previous implementation of adder, copied

[Template](challenges/generator-error-propagation.js)

[Solution](solutions/generator-error-propagation-solution.js)

Boom! We've implemented a set of co-routines that can pass messages and exceptions to each other,
  just like a real generator can.

But it's getting gnarly isn't it? The state machine implementation is starting to drift further from
the generator implementation. Not only is the error handling adding cruft, the fact that we have a
longer while loop makes the code more complicated. To convert the while loop, we have to "unfurl"
loop into states. Our case 1 actually 2 half iterations of the while loop because the `yield` breaks
it in the middle. And finally, we had to add extra code to propagate exceptions from the caller back
to the caller if the generator doesn't have a `try/catch` block to handle it.

You made it!! We finished the deep dive into how generators could potentially be implemented, and I
hope you've gained a better intuitive understanding of how generators work. In summary:

- A generator can produce or consume values, or both
- A generator's state can be paused (state, state machine, get it?)
- A caller and a generator can form a set of co-routines that cooperate with each other
- Exceptions can be sent in either direction.

A potentially useful way to think of generators, now that we have a better understanding, a syntax
for us to write concurrently running routines can pass messages to each other through a single value
channel (the `yield` statement). This will be useful in the next section, where we derive the
implementation of `co()` from co-routines.

## Inversion of control using co-routines

Now that we are generator experts, let's think about how we can apply generators to asynchronous
programming. Being able to write generators by themselves does not mean that Promises within
generators can automatically get resolved. But wait, generators aren't designed to work by
themselves. They are designed to work in cooperation with another program, the primary routine, the
one that calls `.next()` and `.throw()`.

What if, instead of putting our business logic in the primary routine, we put all our business logic
in the generator. Every time the business logic encounters some asynchronous value like a Promise,
the generator just goes, "I don't want to deal with this craziness, wake me up when it resolves",
and pauses and yields the Promise to a servant routine. And the servant routine decides, "fine,
I'll call you later". Then the servant routine registers a callback on the promise, exits, and
waits for the event loop to call it when the promise resolves. When it does, it goes "hey, it's
ready, your turn", and sends the value via `.next()` to the sleeping generator, waits for the
generator to do its thing, and then gets back another asynchronous chore to deal with... and so
on. And so goes the sad story of how the servant routine serves the generator for all time.

Sniff, let's get back to the main topic. Given our knowledge of how generators and promises work, it
shouldn't be too difficult for us to create this "servant routine". The servant routine will itself,
execute concurrently as a Promise, instantiating and serving the generator, and then returning the
final result to our primary routine via a `.then()` callback.

Now let's go back and look at the `co()` program. `co()` is the servant routine that's slaving away
so that the generator can work off of only synchronous values. Makes a lot more sense now right?

```javascript
co(function* () {
  var user = yield fetch('/api/user/self');
  var interests = yield fetch('/api/user/interests?userId=' + self.id);
  var recommendations = yield Promise.all(
      interests.map(i => fetch('/api/recommendations?topic=' + i)));
  render(user, interests, recommendations);
});
```

### Coding challenge - `co()` simple

Great! Now let's build `co()` ourselves and build up some intuition on how exactly this slave
routine works. `co()` must

- Return a Promise for the caller to wait on
- Instantiate the generator
- Continuously call `.next()` to get new values
- If it gets a Promise, it must wait for it to complete and pass the resolved value to the generator
- If it's not a Promise, it will assume the generator made a mistake and pass it back.

Let's not worry about errors for now, and build a simple `co()` method that can handle the contrived
example below:

[Template](challenges/co-simple.js)

```javascript
function deferred(val) {
  return new Promise((resolve, reject) => resolve(val));
}

co(function* asyncAdds(initialValue) {
  console.log(yield deferred(initialValue + 1));
  console.log(yield deferred(initialValue + 2));
  console.log(yield deferred(initialValue + 3));
});

function co(generator) {
  return new Promise((resolve, reject) => {
    // Your code goes here
  });
}
```

[Solution](solutions/co-simple-solution.js)

Not too bad at all right? With about 10 lines of code we duplicated core functionality of the once
magical and almighty `co()`. Let's see if we can add on it. How about exception handling?


### Coding challenge - `co()` exception handling

When a Promise yielded by the generator is rejected, we want `co()` to signal the exception to
the generator routine. Remember that the generator interface provides a `.throw()` method for us to
send exceptions over.

[Template](challenges/co-error.js)

```javascript
function deferred(val) {
  return new Promise((resolve, reject) => resolve(val));
}

function deferReject(e) {
  return new Promise((resolve, reject) => reject(e));
}

co(function* asyncAdds() {
  console.log(yield deferred(1));
  try {
    console.log(yield deferredError(new Error('To fail, or to not fail.')));
  } catch (e) {
    console.log('To not fail!');
  }
  console.log(yield deferred(3));
});

function co(generator) {
  return new Promise((resolve, reject) => {
    // Your code goes here.
  });
}
```

[Solution](solutions/co-error-solution.js)

This gets a little tricky. We need different callbacks depending on if the yielded promise resolved
or rejected, so the solution moves the `.next()` call into a separate `onResolve()` method, and uses
a separate `onReject()` method to call `.throw()` when needed. Both of the callbacks are wrapped in
`try/catch` themselves to reject the `co()` promise immediately if the generator didn't have a
try/catch for the error.

So, we've built `co()`! Almost! `co()` also has support for thunks, nested generators, arrays of the
above, and deep objects of the above. But not so magical anymore is it?

## The holy grail: async/await

Yay, now we understand generators AND `co()`. But is this any use to us when `async/await` is
here? The answer is YES! The understanding we built so far makes it really easy to understand async
await.

The `async` keyword allows us to declare functions that can be suspended with the `await`
keyword, just like generators can be suspended with the `yield` keyword. `await` can only be used on
Promises, and only within execution stacks of functions wrapped with `async`. `async` functions,
when executed, return Promises.

So to convert a function below like the below to use `async/await` instead of generators, you
basically have to replace `co()` with `async` and `yield` with `await`, and drop the `*` from the
function so it's no longer a generator.

```javascript
co(function* () {
  var user = yield fetch('/api/user/self');
  var interests = yield fetch('/api/user/interests?userId=' + self.id);
  var recommendations = yield Promise.all(
      interests.map(i => fetch('/api/recommendations?topic=' + i)));
  render(user, interests, recommendations);
});
```

Becomes:

```javascript
async function () {
  var user = await fetch('/api/user/self');
  var interests = await fetch('/api/user/interests?userId=' + self.id);
  var recommendations = await Promise.all(
      interests.map(i => fetch('/api/recommendations?topic=' + i)));
  render(user, interests, recommendations);
}();
```

There are a few minor quirks/differences to note though:

- `co()` immediately executes the asynchronous generator. `async` creates the function but you still
  have to call it. `async` is more like the `co()` variant `co.wrap()`.
- With `co()`, you can `yield` Promises, thunks, arrays of Promises, or objects of Promises. With
  `async`, you can only `await` on Promises
- You can't use `async` to `await` on generators. That wouldn't make sense. But you can use `co()`
  to wrap code written with async generators into a Promise, which `await` can then be used on.

## Ending

We reviewed the entire abridged history of Javascript asynchronous programming, figured out how
generators and `co()` work "behind the scenes", and then learned how we can apply the intuitions and
learnings to `async/await`. Feeling proud? You should.

Congratulations. You've graduated!

THE END.
