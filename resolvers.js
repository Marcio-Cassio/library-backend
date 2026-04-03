const { GraphQLError } = require('graphql')
const { PubSub } = require('graphql-subscriptions')
const jwt = require('jsonwebtoken')

const Author = require('./models/author')
const Book = require('./models/book')
const User = require('./models/user')

const pubsub = new PubSub()

const resolvers = {
  Query: {
    bookCount: async () => Book.countDocuments(),
    authorCount: async () => Author.countDocuments(),
    allBooks: async (root, args) => {
      const filter = {}

      if (args.genre) {
        filter.genres = { $in: [args.genre] }
      }

      let books = await Book.find(filter).populate('author')

      if (args.author) {
        books = books.filter(book => book.author.name === args.author)
      }

      return books
    },
    allAuthors: async () => {
      const authors = await Author.find({})
      const books = await Book.find({})

      return authors.map(author => ({
        ...author.toObject(),
        bookCount: books.filter(b => b.author.toString() === author._id.toString()).length
      }))
    },
    me: (root, args, context) => context.currentUser,
  },

  Mutation: {
    addBook: async (root, args, context) => {
      if (!context.currentUser) {
        throw new GraphQLError('not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      let author = await Author.findOne({ name: args.author })

      if (!author) {
        author = new Author({ name: args.author })
        try {
          await author.save()
        } catch (error) {
          throw new GraphQLError('Saving author failed: ' + error.message, {
            extensions: { code: 'BAD_USER_INPUT', error },
          })
        }
      }

      const book = new Book({ ...args, author: author._id })
      try {
        await book.save()
      } catch (error) {
        throw new GraphQLError('Saving book failed: ' + error.message, {
          extensions: { code: 'BAD_USER_INPUT', error },
        })
      }

      const populatedBook = await book.populate('author')
      pubsub.publish('BOOK_ADDED', { bookAdded: populatedBook })
      return populatedBook
    },

    editAuthor: async (root, args, context) => {
      if (!context.currentUser) {
        throw new GraphQLError('not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const author = await Author.findOne({ name: args.name })
      if (!author) return null

      author.born = args.setBornTo
      try {
        await author.save()
      } catch (error) {
        throw new GraphQLError('Saving author failed: ' + error.message, {
          extensions: { code: 'BAD_USER_INPUT', error },
        })
      }

      return author
    },

    createUser: async (root, args) => {
      const user = new User({ username: args.username, favoriteGenre: args.favoriteGenre })
      try {
        await user.save()
      } catch (error) {
        throw new GraphQLError('Creating user failed: ' + error.message, {
          extensions: { code: 'BAD_USER_INPUT', error },
        })
      }
      return user
    },

    login: async (root, args) => {
      const user = await User.findOne({ username: args.username })

      if (!user || args.password !== 'secret') {
        throw new GraphQLError('wrong credentials', {
          extensions: { code: 'BAD_USER_INPUT' },
        })
      }

      const userForToken = { username: user.username, id: user._id }
      return { value: jwt.sign(userForToken, process.env.JWT_SECRET) }
    },
  },

  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterableIterator('BOOK_ADDED'),
    },
  },
}

module.exports = resolvers