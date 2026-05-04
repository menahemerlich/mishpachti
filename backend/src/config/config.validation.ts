type EnvRecord = Record<string, string | undefined>;

const REQUIRED_VARS = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

export function configValidationSchema(config: EnvRecord) {
  const missing: string[] = [];
  for (const key of REQUIRED_VARS) {
    if (!config[key] || config[key]?.trim() === '') {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'See .env.example for the full list.',
    );
  }
  return config;
}
