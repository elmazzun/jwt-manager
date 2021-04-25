import t from 'tap'
import { build } from '../helper.js'

/**
 * Here follows tap integration tests on 'users' route: each test is documented
 * about the operations it is going to perform; each test is passed if all the
 * said operations are successful
 */

// New user registration -> OK
t.test('Register route', async t => {
  const fastify = await build(t)
  const registerResp = await fastify.inject({
    method: 'POST',
    path: '/api/auth/register',
    payload: {
      username: 'prova',
      email: 'prova@gmail.com',
      password: 'prova'
    }
  })

  t.equal(registerResp.statusCode, 200)
  t.same(registerResp.json(), { message: 'User created successfully' })
})

// New user registration &&
// new user logs in -> OK
t.test('Login route', async t => {
  const fastify = await build(t)

  // Create new user
  const registerResp = await fastify.inject({
    method: 'POST',
    path: '/api/auth/register',
    payload: {
      username: 'prova',
      email: 'prova@gmail.com',
      password: 'prova'
    }
  })
  t.equal(registerResp.statusCode, 200)
  t.same(registerResp.json(), { message: 'User created successfully' })

  // Login with just created user
  const loginResp = await fastify.inject({
    method: 'POST',
    path: '/api/auth/login',
    payload: {
      username: 'prova',
      email: 'prova@gmail.com',
      password: 'prova'
    }
  })
  t.equal(loginResp.statusCode, 200)
})

// New user registration &&
// new user logs in      &&
// get a resource using his new JWT -> OK
t.test('Get resource route', async t => {
  const fastify = await build(t)
  const registerResp = await fastify.inject({
    method: 'POST',
    path: '/api/auth/register',
    payload: {
      username: 'prova',
      email: 'prova@gmail.com',
      password: 'prova'
    }
  })
  t.equal(registerResp.statusCode, 200)
  t.same(registerResp.json(), { message: 'User created successfully' })

  const loginResp = await fastify.inject({
    method: 'POST',
    path: '/api/auth/login',
    payload: {
      username: 'prova',
      email: 'prova@gmail.com',
      password: 'prova'
    }
  })
  t.equal(loginResp.statusCode, 200)

  const jwt = `Bearer ${loginResp.payload}`
  const getResp = await fastify.inject({
    method: 'GET',
    path: '/api/users/prova',
    headers: { Authorization: jwt }
  })
  t.equal(loginResp.statusCode, 200)
  t.same(JSON.parse(getResp.payload), { email: 'prova@gmail.com', username: 'prova' })
})

// New user registration       &&
// new user logs in            &&
// new user revoke its own JWT &&
// new user fails to get a resource -> OK
t.test('Revoke token by user name route', async t => {
  const fastify = await build(t)
  const registerResp = await fastify.inject({
    method: 'POST',
    path: '/api/auth/register',
    payload: {
      username: 'prova',
      email: 'prova@gmail.com',
      password: 'prova'
    }
  })
  t.equal(registerResp.statusCode, 200)
  t.same(registerResp.json(), { message: 'User created successfully' })

  const loginResp = await fastify.inject({
    method: 'POST',
    path: '/api/auth/login',
    payload: {
      username: 'prova',
      email: 'prova@gmail.com',
      password: 'prova'
    }
  })
  t.equal(loginResp.statusCode, 200)

  const jwt = `Bearer ${loginResp.payload}`
  const revokeResp = await fastify.inject({
    method: 'POST',
    path: '/api/auth/tokens/revoke/prova',
    headers: { Authorization: jwt }
  })
  t.equal(revokeResp.statusCode, 200)
  t.same(revokeResp.json(), { message: 'revoked' })

  const getResource = await fastify.inject({
    method: 'GET',
    path: '/api/users/prova',
    headers: { Authorization: jwt }
  })
  t.equal(getResource.statusCode, 401)
  // t.same(getResource.json(), { error: 'Unauthorized' })
  // t.same(getResource.json(), { message: 'Invalid token' })
})

// New user registration         &&
// new user logs in              &&
// new user changes its password &&
// new user logs in with the new password -> OK
t.test('Change password route', async t => {
  const fastify = await build(t)
  const registerResp = await fastify.inject({
    method: 'POST',
    path: '/api/auth/register',
    payload: {
      username: 'prova',
      email: 'prova@gmail.com',
      password: 'prova'
    }
  })
  t.equal(registerResp.statusCode, 200)
  t.same(registerResp.json(), { message: 'User created successfully' })

  let loginResp = await fastify.inject({
    method: 'POST',
    path: '/api/auth/login',
    payload: {
      username: 'prova',
      email: 'prova@gmail.com',
      password: 'prova'
    }
  })
  t.equal(loginResp.statusCode, 200)

  const jwt = `Bearer ${loginResp.payload}`
  const changePswdResp = await fastify.inject({
    method: 'POST',
    path: '/api/auth/tokens/passwordreset',
    headers: { Authorization: jwt },
    payload: {
      username: 'prova',
      oldpassword: 'prova',
      newpassword: 'prova-nuova'
    }
  })
  t.equal(changePswdResp.statusCode, 200)
  t.same(changePswdResp.json(), { message: 'Password reset OK' })

  loginResp = await fastify.inject({
    method: 'POST',
    path: '/api/auth/login',
    payload: {
      username: 'prova',
      email: 'prova@gmail.com',
      password: 'prova-nuova'
    }
  })
  t.equal(loginResp.statusCode, 200)
})

t.test('Change role route', async t => {
  const fastify = await build(t)
  const registerResp = await fastify.inject({
    method: 'POST',
    path: '/api/auth/register',
    payload: {
      username: 'prova',
      email: 'prova@gmail.com',
      password: 'prova'
    }
  })
  t.equal(registerResp.statusCode, 200)
  t.same(registerResp.json(), { message: 'User created successfully' })

  const loginResp = await fastify.inject({
    method: 'POST',
    path: '/api/auth/login',
    payload: {
      username: 'prova',
      email: 'prova@gmail.com',
      password: 'prova'
    }
  })
  t.equal(loginResp.statusCode, 200)

  const jwt = `Bearer ${loginResp.payload}`
  const changeRoleResp = await fastify.inject({
    method: 'POST',
    path: '/api/auth/changeroles',
    headers: { Authorization: jwt },
    payload: {
      role: 'admin'
    }
  })
  t.equal(changeRoleResp.statusCode, 200)
  t.same(changeRoleResp.json(), { message: 'Role update ok' })
})

// New user registration                                      &&
// new user logs in                                           &&
// new user revoke all those JWT issued earlier than tomorrow &&
// user fails to get a resource -> OK
t.test('Revoke token by date route', async t => {
  const fastify = await build(t)
  const registerResp = await fastify.inject({
    method: 'POST',
    path: '/api/auth/register',
    payload: {
      username: 'prova',
      email: 'prova@gmail.com',
      password: 'prova'
    }
  })
  t.equal(registerResp.statusCode, 200)
  t.same(registerResp.json(), { message: 'User created successfully' })

  const loginResp = await fastify.inject({
    method: 'POST',
    path: '/api/auth/login',
    payload: {
      username: 'prova',
      email: 'prova@gmail.com',
      password: 'prova'
    }
  })
  t.equal(loginResp.statusCode, 200)

  let jwt = `Bearer ${loginResp.payload}`
  // now + 1 day in milliseconds = tomorrow
  const tomorrow = Date.now() + 86400000
  const revokeByDatetimeResp = await fastify.inject({
    method: 'POST',
    path: '/api/auth/tokens/revokeolder',
    headers: { Authorization: jwt },
    payload: {
      datetime: tomorrow
    }
  })
  t.equal(revokeByDatetimeResp.statusCode, 200)

  const newLoginResp = await fastify.inject({
    method: 'POST',
    path: '/api/auth/login',
    headers: { Authorization: jwt },
    payload: {
      username: 'prova',
      email: 'prova@gmail.com',
      password: 'prova'
    }
  })
  t.equal(newLoginResp.statusCode, 200)

  jwt = `Bearer ${newLoginResp.payload}`
  const getResp = await fastify.inject({
    method: 'GET',
    path: '/api/users/prova',
    headers: { Authorization: jwt }
  })
  t.equal(getResp.statusCode, 401)
  t.same(getResp.json(), { statusCode: 401, error: 'Unauthorized', message: 'Your token is expired' })
})
