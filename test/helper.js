import { unlink } from 'fs'
import Fastify from 'fastify'
import fp from 'fastify-plugin'
import App from '../app.js'

/**
 * This helper file is used in the test suite to start and tear down Fastify
 * when needed.
 */

// We need to load the env configuration
process.env.NODE_ENV = 'development'
process.env.ALLOWED_USERS = 'foo@bar.com'
// During test, we will use another DB
process.env.DATABASE_FILE = 'test.db'

let app = Fastify()

// Each time a test is done, terminate Fastify instance
async function terminateTest () {
  await app.close()
  await unlink(process.env.DATABASE_FILE, function (err) {
    if (err) {
      console.log(err)
    }
  })
}

// Build and return a Fastify instance with all plugins loaded
export async function build (t, opts = {}) {
  app = Fastify()
  await app.register(fp(App), { testing: true, ...opts })
  await app.listen(3000)

  t.teardown(terminateTest)

  return app
}
