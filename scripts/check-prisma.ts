import { prisma } from './lib/db'

async function main() {
  console.log('Available Prisma models:')
  console.log(Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')))
}

main()
