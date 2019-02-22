
const redisClient = config => require('redis').createClient( ... ( config.REDIS_CONNECTION || [] ) )

const aquireLock = (id, config) => new Promise((resolve, reject) => redisClient(config).set(
  ... ( [ `${config.KEY_PREFIX+id}`, 1, 'NX' ] ),
  ... ( 'number' === typeof config.NX_EXPIRES ? [ 'EX', config.NX_EXPIRES ] : [] ),
  (err, reply) => err ? reject(err) : resolve(reply)
))

const releaseLock = (id, config) => new Promise((resolve, reject) =>
  redisClient(config).del(`${config.KEY_PREFIX+id}`, (err, reply) => err ? reject(err) : resolve(reply))
)

module.exports = ( key, options ) =>
{
  // default configuration
  const config = {
    REDIS_CONNECTION: null, // pass an array for the connection [ port, host ]
    NX_EXPIRES: 60 *60, // a default expiration lock keys (don't persist them in memory) defaults to 1 hour
    DELAY_MS: 200, // delay between retries
    KEY_PREFIX: 'lock.', // a prefix for the redis key
    ABORT_AFTER_MS: null, // optionally stop trying after X milliseconds elpased
  }

  // merge configuration
  options && 'object' === typeof options && Object.assign(config, options)

  // record initial start time
  this.begin_time = this.begin_time || +new Date

  // retry event
  this.onRetry = callback => this._onRetry = callback 

  // aborter
  this.abort = _ => this._abort = true

  // executor
  this.aquire = _ => new Promise(async (resolve, reject) =>
  {
    while ( true ) {
      if ( this._abort ) {
        return reject()
      }

      if ( parseInt(config.ABORT_AFTER_MS) > 0 && +new Date - this.begin_time > config.ABORT_AFTER_MS ) {
        return reject()
      }

      try { this._aquired = await aquireLock(key, config) } catch (e) { /* pass */ }

      if ( this._aquired ) {
        return resolve()
      }

      // temporarily block the loop
      await new Promise(res => setTimeout(_ => res(1), config.DELAY_MS||100))

      // maybe call user retry definition
      'function' === typeof this._onRetry && this._onRetry()
    }
  })

  // releasing locks
  this.release = _ => releaseLock(key, config)

  return this
}
