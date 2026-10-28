import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') })

export const apiConfigSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(3).default(0),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    JWT_SECRET: z
      .string()
      .min(32, 'JWT_SECRET must be at least 32 characters')
      .refine((value) => !value.startsWith('replace-'), {
        message: 'Replace the example JWT_SECRET with a randomly generated secret.',
      }),
    APP_ORIGINS: z
      .string()
      .default('http://localhost:5173,http://127.0.0.1:5173')
      .refine(
        (origins) =>
          origins.split(',').every((origin) => {
            const value = origin.trim()
            try {
              const parsed = new URL(value)
              return (
                parsed.origin === value &&
                (parsed.protocol === 'http:' || parsed.protocol === 'https:')
              )
            } catch {
              return false
            }
          }),
        { message: 'APP_ORIGINS must contain comma-separated exact HTTP(S) origins.' },
      ),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(600),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(14),
    PUBLIC_SUBMISSIONS_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    PUBLIC_REGISTRATION_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    PRIVACY_NOTICE_VERSION: z.string().min(1).max(40).default('draft-1'),
    ADMIN_BOOTSTRAP_EMAIL: z
      .string()
      .email()
      .transform((value) => value.toLowerCase())
      .optional(),
    ADMIN_BOOTSTRAP_PASSWORD: z
      .string()
      .min(12)
      .max(72)
      .refine((value) => Buffer.byteLength(value, 'utf8') <= 72)
      .optional(),
  })
  .refine(
    (values) =>
      (!values.PUBLIC_SUBMISSIONS_ENABLED && !values.PUBLIC_REGISTRATION_ENABLED) ||
      !values.PRIVACY_NOTICE_VERSION.startsWith('draft'),
    {
      message:
        'Use a reviewed privacy notice version before enabling public form submissions.',
      path: ['PRIVACY_NOTICE_VERSION'],
    },
  )
  .refine(
    (values) =>
      values.NODE_ENV !== 'production' ||
      (values.TRUST_PROXY_HOPS > 0 &&
        values.APP_ORIGINS.split(',').every((origin) => origin.trim().startsWith('https://'))),
    {
      message:
        'Production requires HTTPS APP_ORIGINS and the exact positive TRUST_PROXY_HOPS value.',
      path: ['APP_ORIGINS'],
    },
  )
const parsedConfig = apiConfigSchema.safeParse(process.env)
if (!parsedConfig.success) {
  throw new Error(`Invalid API configuration: ${parsedConfig.error.message}`)
}

export const config = {
  ...parsedConfig.data,
  APP_ORIGINS: parsedConfig.data.APP_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
}
