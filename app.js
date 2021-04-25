import AutoLoad from 'fastify-autoload'
import Sensible from 'fastify-sensible'
import Env from 'fastify-env'
import S from 'fluent-json-schema'
import { join } from 'desm'

/**
 * This is our entry point: using Fastify provided plugins, it loads env
 * variables, Sensible and all our plugins stored in plugins/ and /routes
 */

export default async function (fastify, opts) {
  // Using `fastify-env` plugin will expose those configuration
  // under `fastify.config` and validate them at startup
  fastify.register(Env, {
    schema: S.object()
      .prop('NODE_ENV', S.string().required())
      .prop('ALLOWED_USERS', S.string().required())
      .prop('DATABASE_FILE', S.string().required())
      .valueOf()
  })

  // `fastify-sensible` adds many small utilities, such as nice http errors
  fastify.register(Sensible)

  // `fastify-autoload` loads all the content from the specified folder
  // First of all, we require all the plugins that we'll need in our application
  fastify.register(AutoLoad, {
    dir: join(import.meta.url, 'plugins'),
    options: Object.assign({}, opts)
  })

  // Then, we'll load all of our routes
  fastify.register(AutoLoad, {
    dir: join(import.meta.url, 'routes'),
    dirNameRoutePrefix: false,
    options: Object.assign({}, opts)
  })
}
