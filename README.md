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
    }
  }
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
    .then(function (recomendations) {
        render(user, interests, recommendations);
    });
```

Beautiful, right? See what's wrong with the code yet?

............................Ooops.....................

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

Generators are simple to use, but there's actually a lot going on here.
