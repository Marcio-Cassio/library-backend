require('dotenv').config()
const { startStandaloneServer } = require('@apollo/server/standalone')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')

const server = require('./server')
const User = require('./models/user')

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('connected to MongoDB'))
  .catch((error) => console.log('error connecting to MongoDB:', error.message))

startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null
    if (auth && auth.startsWith('Bearer ')) {
      const decodedToken = jwt.verify(auth.substring(7), process.env.JWT_SECRET)
      const currentUser = await User.findById(decodedToken.id)
      return { currentUser }
    }
  },
}).then(({ url }) => {
  console.log(`Server ready at ${url}`)
})
