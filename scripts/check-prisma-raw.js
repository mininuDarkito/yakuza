const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

console.log('Models in Prisma Client:')
console.log(Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')))
process.exit(0)
