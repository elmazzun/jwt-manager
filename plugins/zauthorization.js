/* eslint camelcase: 0 */

import fp from 'fastify-plugin'
import jwt from 'jsonwebtoken'

/**
 * Authorization plugin: auth function is run as preHandler
 * for all those API functions that requires authorization
 */

async function auth (fastify, opts) {
  const { httpErrors, database } = fastify
  // Exporting 'datetime', which keeps track of those JWT whose 'iat'
  // property must not be older than 'datetime'
  fastify.decorate('olderthan', { datetime: 0 })

  fastify.decorate('authorize', authorize)

  async function authorize (req) {
    const bearer = req.headers.authorization
    if (!bearer.startsWith('Bearer ')) {
      throw httpErrors.unauthorized('Wrong Bearer format')
    }
    const token = bearer.split(' ')[1]
    const decoded = jwt.decode(token)
    const { username, role, iat } = decoded

    let users
    try {
      users = await database('users')
        .where({ username })
    } catch (err) {
      return httpErrors.internalServerError('Query on DB failed')
    }

    if (users.length !== 1) {
      throw httpErrors.notFound('No user in DB')
    }
    const user = users[0]
    const { token_key } = user

    if (user.role !== role) {
      throw httpErrors.unauthorized('Role not high enough')
    }

    if (iat < fastify.olderthan.datetime) {
      throw httpErrors.unauthorized('Your token is expired')
    }

    try {
      await jwt.verify(token, token_key)
    } catch (err) {
      throw httpErrors.unauthorized('Invalid token')
    }

    // Add decoded token in the request for further operations
    req.user = decoded
  }
}

export default fp(auth, {
  name: 'authorization'
})
