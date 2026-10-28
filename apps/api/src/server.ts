import { createServer } from 'node:http'
import { createApp } from './app.js'
import { config } from './config.js'
import { prisma } from './prisma.js'

const server = createServer(createApp(prisma))

server.listen(config.PORT, () => {
  console.info(`Bridgeline API listening on port ${config.PORT}`)
})

async function shutdown(signal: string) {
  console.info(`Received ${signal}; shutting down API`)
  server.close(async (error) => {
    if (error) {
      console.error('API server shutdown failed', error)
      process.exitCode = 1
    }
    await prisma.$disconnect()
    process.exit()
  })
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
