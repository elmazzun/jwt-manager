import S from 'fluent-json-schema'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import cryptoRandomString from 'crypto-random-string'

export const autoPrefix = '/api'

export default async function user (fastify, opts) {
  const {
    httpErrors, // Nice HTTP errors handling
    database, // Knex instance
    authorize, // Authorization plugin
    olderthan // Any JWT issued earlier than this datetime is not valid
  } = fastify

  fastify.route({
    method: 'GET',
    path: '/users/:username',
    schema: {
      response: {
        200: S.object()
          .prop('email', S.string())
          .prop('username', S.string())
      }
    },
    preHandler: [authorize],
    handler: getUser
  })

  async function getUser (req) {
    let users
    try {
      users = await database('users')
        .where({
          username: req.params.username
        })
    } catch (err) {
      throw httpErrors.internalServerError('Query on DB failed')
    }
    if (users.length !== 1) {
      return httpErrors.notFound('User not found')
    }

    return users[0]
  }

  fastify.route({
    method: 'POST',
    path: '/auth/login',
    schema: {
      description: '',
      header: S.object()
        .prop('Authorization', S.string().required()),
      body: S.object()
        .prop('username', S.string().required())
        .prop('email', S.string().required())
        .prop('password', S.string().required()),
      response: {
        200: S.string()
      }
    },
    handler: login
  })

  async function login (req) {
    const { username, password } = req.body
    let selectedRows
    try {
      selectedRows = await database('users')
        .where({ username })
    } catch (err) {
      throw httpErrors.internalServerError('Query on DB failed')
    }

    if (selectedRows.length !== 1) {
      return httpErrors.notFound('User not found in DB')
    }

    const user = selectedRows[0]
    const { email, role } = user
    const result = await bcrypt.compare(password, user.password)
    if (!result) {
      return httpErrors.unauthorized('Wrong password')
    }

    const now = Date.now()
    // Token expires in 1 day after being created
    const payload = {
      username,
      email,
      role,
      iat: now
    }
    const token = await jwt.sign(payload, user.token_key, { expiresIn: '1d' })

    return token
  }

  fastify.route({
    method: 'POST',
    path: '/auth/tokens/revoke/:username',
    schema: {
      description: '',
      header: S.object()
        .prop('Authorization', S.string().required()),
      response: {
        200: S.object()
          .prop('message', S.string())
      }
    },
    preHandler: [authorize],
    handler: revoke
  })

  async function revoke (req) {
    const secret = cryptoRandomString({ length: 64, type: 'base64' })

    try {
      await database('users')
        .where({
          username: req.params.username
        })
        .update({
          token_key: secret,
          invalidated: true
        })
    } catch (err) {
      return httpErrors.internalServerError('Query on DB failed')
    }
    return { message: 'revoked' }
  }

  fastify.route({
    method: 'POST',
    path: '/auth/tokens/passwordreset',
    schema: {
      description: '',
      body: {
        username: { type: 'string' },
        oldpassword: { type: 'string' },
        newpassword: { type: 'string' }
      },
      response: {
        200: S.object()
          .prop('message', S.string())
      }
    },
    preHandler: [authorize],
    handler: passwordReset
  })

  async function passwordReset (req) {
    const { username, oldpassword, newpassword } = req.body

    // Get user from DB
    let users
    try {
      users = await database('users')
        .where({ username })
    } catch (err) {
      throw httpErrors.internalServerError('Query on DB failed')
    }
    if (users.length !== 1) {
      return httpErrors.notFound('User not found in DB')
    }
    const user = users[0]

    // Compare old password with password retrieved from DB
    const result = await bcrypt.compare(oldpassword, user.password)
    if (!result) {
      return httpErrors.unauthorized('passwordreset: wrong credentials')
    }

    // Update password stored in DB
    const newPassHashed = await bcrypt.hash(newpassword, 10)
    try {
      await database('users')
        .where({ username })
        .update({ password: newPassHashed })
    } catch (err) {
      throw httpErrors.internalServerError('Query on DB failed')
    }
    return { message: 'Password reset OK' }
  }

  fastify.route({
    method: 'POST',
    path: '/auth/register',
    schema: {
      description: '',
      body: S.object()
        .prop('username', S.string().required())
        .prop('email', S.string().required())
        .prop('password', S.string().required()),
      response: {
        200: S.object()
          .prop('message', S.string())
      }
    },
    handler: register
  })

  async function register (req) {
    const { username, email, password } = req.body

    let users
    try {
      users = await database('users')
        .where({ username })
    } catch (err) {
      throw httpErrors.internalServerError('Query on DB failed')
    }
    if (users.length !== 0) {
      return httpErrors.notImplemented('User already exists in DB')
    }
    const hashedPassword = await bcrypt.hash(password, 10)
    const secret = cryptoRandomString({ length: 64, type: 'base64' })

    try {
      await database('users').insert({
        email,
        username,
        password: hashedPassword,
        token_key: secret,
        role: 'guest'
      })
    } catch (err) {
      throw httpErrors.internalServerError('Query on DB failed')
    }
    return { message: 'User created successfully' }
  }

  fastify.route({
    method: 'POST',
    path: '/auth/changeroles',
    schema: {
      description: '',
      response: {
        200: S.object()
          .prop('message', S.string())
      }
    },
    preHandler: [authorize],
    handler: changeRoles
  })

  async function changeRoles (req) {
    // From token
    const { username } = req.user
    // From request
    const { role } = req.body

    try {
      await database('users')
        .where({ username })
        .update({ role })
    } catch (err) {
      throw httpErrors.internalServerError('Query on DB failed')
    }

    return { message: 'Role update ok' }
  }

  fastify.route({
    method: 'POST',
    path: '/auth/tokens/revokeolder',
    schema: {
      description: '',
      response: {
        200: S.object()
          .prop('message', S.string())
      }
    },
    preHandler: [authorize],
    handler: revokeOlder
  })

  function revokeOlder (req) {
    const { datetime } = req.body
    olderthan.datetime = datetime
    return { message: `Rejecting now tokens older than ${olderthan.datetime}` }
  }
}
