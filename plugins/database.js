import fp from 'fastify-plugin'
import knex from 'knex'

/**
 * Database plugin: it uses SQLite under Knex
 */

async function database (fastify, opts) {
  const {
    DATABASE_FILE
  } = fastify.config

  const client = knex({
    client: 'sqlite3',
    connection: {
      filename: DATABASE_FILE
    },
    useNullAsDefault: true
  })

  await configureSchema(client)

  // Expose the Knex instance
  fastify.decorate('database', client)

  fastify.addHook('onClose', (instance, done) => {
    client.destroy()
    done()
  })
}

async function configureSchema (client) {
  try {
    await client.schema
      .createTableIfNotExists('users', table => {
        table.increments('id')
        table.string('email')
        table.string('username')
        table.string('password')
        table.string('token_key')
        table.string('role')
        table.boolean('invalidated').defaultTo(false)
      })
  } catch (e) {
    console.error(e)
  };
}

export default fp(database, {
  name: 'database'
})
