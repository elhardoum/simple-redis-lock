# Redis Locks

Simple redis locks using promises and redis `SETNX`.

## Install

```bash
npm install --save simple-redis-lock
```

Then require it

```javascript
const simple_redis_lock = require('simple-redis-lock')
```

## Simple Usage

```javascript
// create a lock object with a lock name
let my_lock = simple_redis_lock('test_lock')

(async _ =>
{
  try {
    // acquire the lock
    await my_lock.acquire()
    console.log('Lock has been acquired. Doing stuff..')

    // release the lock
    await my_lock.release()
    console.log('Lock has been released. Done stuff!')
  } catch (e) {
    // this exception is either from the lock acquisition or release
    console.log('err', e)
  }
})()

// optionally hook into retries
my_lock.onRetry(() =>
{
  console.log(`Retrying... (${(+new Date - my_lock.begin_time) /1000} seconds elapsed)`)

  if ( +new Date - my_lock.begin_time > 2000 ) { // 2 seconds elapsed, abort
    // aborting the lock directly
    my_lock.abort()
  }
})
```

## Available methods

#### `LockObject.acquire()`

Returns a promise that resolves when your lock has been acquired successfully, or rejects when the task is aborted.

Note: the acquire task will run forever by default, until aborted either with `LockObject.abort()` method or via `ABORT_AFTER_MS` option key.

#### `LockObject.release()`

Returns a promise that resolves when your lock key has been freed from redis. It would reject the promise if the key has not been deleted (see redis [`DEL`](https://redis.io/commands/del))

#### `LockObject.abort()`

Allows you to abort the process directly and it will reject the `LockObject.acquire()` upon next acquisition attempt.

#### `LockObject.onRetry(callback)`

Hook into the retry process.

## Configuration

You can pass the custom settings via the second argument passed to the object instantiation:

```javascript
// create a lock object
let my_lock = simple_redis_lock('test_lock', {
  // options
  DELAY_MS: 50,
  ABORT_AFTER_MS: 5000, // 5 seconds
})
```

Here are the default settings:

```javascript
// default configuration
const config = {
  REDIS_CONNECTION: null, // pass an array for the connection [ port, host ]
  NX_EXPIRES: 60 *60, // a default expiration lock keys (don't persist them in memory) defaults to 1 hour
  DELAY_MS: 200, // delay between retries
  KEY_PREFIX: 'lock.', // a prefix for the redis key
  ABORT_AFTER_MS: null, // optionally stop trying after X milliseconds elpased
}
```
