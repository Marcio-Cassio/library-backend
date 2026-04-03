require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')

const startServer = require('./server')
const User = require('./models/user')

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('connected to MongoDB'))
  .catch((error) => console.log('error connecting to MongoDB:', error.message))

startServer(4000).then((httpServer) => {
  httpServer.listen(4000, () => console.log('Server is now running on http://localhost:4000'))
})