process.env.NODE_ENV ??= 'test'
process.env.DATABASE_URL ??=
  'postgresql://bridgeline:replace-this-password@localhost:5432/bridgeline?schema=public'
process.env.JWT_SECRET ??= 'test-only-secret-that-is-at-least-thirty-two-characters'
process.env.APP_ORIGINS ??= 'http://localhost:5173'
process.env.PUBLIC_SUBMISSIONS_ENABLED ??= 'false'
process.env.PUBLIC_REGISTRATION_ENABLED ??= 'false'
process.env.PRIVACY_NOTICE_VERSION ??= 'draft-1'
