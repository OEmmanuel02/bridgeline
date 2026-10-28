import { hash } from 'bcryptjs'
import { config } from '../config.js'
import { prisma } from '../prisma.js'

async function provisionAdmin() {
  const email = config.ADMIN_BOOTSTRAP_EMAIL
  const password = config.ADMIN_BOOTSTRAP_PASSWORD
  if (!email || !password) {
    throw new Error(
      'Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD in the environment to provision an administrator.',
    )
  }

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    throw new Error(
      'An account already exists for that email. Administrator provisioning will not change an existing account role.',
    )
  }

  await prisma.user.create({
    data: {
      email,
      fullName: 'Bridgeline Administrator',
      passwordHash: await hash(password, 12),
      role: 'ADMIN',
    },
  })
  console.info('Administrator account provisioned.')
}

provisionAdmin()
  .catch((error: unknown) => {
    console.error('Administrator provisioning failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
