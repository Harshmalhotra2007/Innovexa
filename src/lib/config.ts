/**
 * Centralized Environment Configuration
 * Single source of truth for all environment variables with type safety,
 * early validation, and consistent defaults.
 */

// ─── Raw Environment Interface ───────────────────────────────────────────────

interface ConfigRaw {
  // Database
  DATABASE_URL?: string;
  DIRECT_URL?: string;
  NODE_ENV?: string;

  // Bot Services
  MEET_BOT_URL?: string;
  BOT_SERVICE_URL?: string;
  BOT_NAME?: string;
  MEETINGBAAS_API_KEY?: string;

  // Storage
  S3_BUCKET?: string;
  AWS_REGION?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_KEY?: string;

  // LiveKit & Real-Time Video
  LIVEKIT_API_KEY?: string;
  LIVEKIT_API_SECRET?: string;
  NEXT_PUBLIC_LIVEKIT_URL?: string;
  LIVEKIT_URL?: string;

  // AI & Speech Services
  OPENAI_API_KEY?: string;
  GROQ_API_KEY?: string;
  CHROMADB_URL?: string;
  KAFKA_BOOTSTRAP_SERVERS?: string;

  // Email & Notifications
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;

  // Webhooks & Redis
  N8N_WEBHOOK_SECRET?: string;
  NEXT_PUBLIC_APP_URL?: string;
  REDIS_HOST?: string;
  REDIS_URL?: string;
  REDIS_PORT?: string;
  REDIS_PASSWORD?: string;

  // Next.js built-ins
  NEXT_RUNTIME?: string;
}

// ─── Exported Type-Safe Configuration Interface ──────────────────────────────

export interface Config {
  // Database
  databaseUrl: string;
  directUrl: string;
  nodeEnv: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;

  // Bot Services
  meetBotUrl: string;
  botName: string;
  meetingBaasApiKey: string;

  // Storage
  s3Bucket?: string;
  s3Region: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  hasS3Storage: boolean;
  hasSupabaseStorage: boolean;

  // LiveKit & Real-Time Video
  livekitApiKey: string;
  livekitApiSecret: string;
  livekitWsUrl: string;
  isLiveKitConfigured: boolean;

  // AI & Speech Services
  openaiApiKey?: string;
  groqApiKey?: string;
  hasOpenAI: boolean;
  hasGroq: boolean;
  chromaDbUrl: string;
  kafkaBootstrapServers: string;

  // Email & Notifications
  resendApiKey?: string;
  emailFrom: string;
  hasEmailService: boolean;

  // Webhooks & Redis
  n8nWebhookSecret: string;
  appUrl: string;
  redisHost: string;
  redisUrl: string;
  redisPort: number;
  redisPassword?: string;

  // Next.js runtime
  nextRuntime?: string;
}

// ─── Default Configurations ──────────────────────────────────────────────────

const DEFAULTS = {
  databaseUrl: "",
  directUrl: "",
  nodeEnv: "development",

  meetBotUrl: "https://innovexa-meet-bot.onrender.com",
  botName: "Innovexa Notetaker",
  meetingBaasApiKey: "mb-liEToZOkOtVPenEVEZYVQUdXhmOhEoxtwoQrdtNGLBUGTTswyYpUlOSOybMqk",

  s3Region: "us-east-1",
  livekitApiKey: "devkey",
  livekitApiSecret: "secret_dev_key_innovexa_native",
  livekitWsUrl: "wss://demo.livekit.cloud",

  chromaDbUrl: "http://localhost:8000",
  kafkaBootstrapServers: "localhost:9092",

  emailFrom: "notifications@innovexa.com",
  n8nWebhookSecret: "innovexa_n8n_sec_2026_key",
  appUrl: "https://innovexa-innovexapu.vercel.app",

  redisHost: "localhost",
  redisUrl: "redis://localhost:6379",
  redisPort: 6379,
} as const;

// ─── Validation Helpers ──────────────────────────────────────────────────────

function warnMissing(varName: string, envVar?: string): void {
  if (process.env.NODE_ENV !== "test" && !envVar) {
    console.warn(`[Config] Missing optional environment variable: ${varName}`);
  }
}

function requireEnv(varName: string, value?: string, fallback?: string): string {
  const resolved = value ?? fallback ?? "";
  if (!resolved && process.env.NODE_ENV !== "test") {
    throw new Error(
      `[Config] Required environment variable "${varName}" is missing. Please set it in your .env file.`
    );
  }
  return resolved;
}

// ─── Config Factory ──────────────────────────────────────────────────────────

export function createConfig(env: ConfigRaw = {}): Config {
  const {
    DATABASE_URL,
    DIRECT_URL,
    NODE_ENV,
    MEET_BOT_URL,
    BOT_SERVICE_URL,
    BOT_NAME,
    MEETINGBAAS_API_KEY,
    S3_BUCKET,
    AWS_REGION,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    SUPABASE_URL,
    SUPABASE_KEY,
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET,
    NEXT_PUBLIC_LIVEKIT_URL,
    LIVEKIT_URL,
    OPENAI_API_KEY,
    GROQ_API_KEY,
    CHROMADB_URL,
    KAFKA_BOOTSTRAP_SERVERS,
    RESEND_API_KEY,
    EMAIL_FROM,
    N8N_WEBHOOK_SECRET,
    NEXT_PUBLIC_APP_URL,
    REDIS_HOST,
    REDIS_URL,
    REDIS_PORT,
    REDIS_PASSWORD,
    NEXT_RUNTIME,
  } = env;

  const nodeEnv = NODE_ENV ?? DEFAULTS.nodeEnv;
  const isProduction = nodeEnv === "production";
  const isDevelopment = nodeEnv === "development";
  const isTest = nodeEnv === "test";

  // Validate required variables
  const databaseUrl = requireEnv("DATABASE_URL", DATABASE_URL, DEFAULTS.databaseUrl);
  const directUrl = requireEnv("DIRECT_URL", DIRECT_URL, DEFAULTS.directUrl);

  // Optional variables tracking with warnings
  warnMissing("S3_BUCKET", S3_BUCKET);
  warnMissing("AWS_ACCESS_KEY_ID", AWS_ACCESS_KEY_ID);
  warnMissing("AWS_SECRET_ACCESS_KEY", AWS_SECRET_ACCESS_KEY);
  warnMissing("SUPABASE_URL", SUPABASE_URL);
  warnMissing("SUPABASE_KEY", SUPABASE_KEY);
  warnMissing("OPENAI_API_KEY", OPENAI_API_KEY);
  warnMissing("RESEND_API_KEY", RESEND_API_KEY);

  const resolvedLiveKitApiKey = LIVEKIT_API_KEY ?? DEFAULTS.livekitApiKey;
  const resolvedLiveKitApiSecret = LIVEKIT_API_SECRET ?? DEFAULTS.livekitApiSecret;
  const resolvedLiveKitWsUrl = NEXT_PUBLIC_LIVEKIT_URL ?? LIVEKIT_URL ?? DEFAULTS.livekitWsUrl;

  const isLiveKitConfigured = Boolean(
    LIVEKIT_API_KEY &&
      LIVEKIT_API_SECRET &&
      (NEXT_PUBLIC_LIVEKIT_URL ?? LIVEKIT_URL) &&
      !resolvedLiveKitWsUrl.includes("demo.livekit.cloud")
  );

  return {
    // Database
    databaseUrl,
    directUrl,
    nodeEnv,
    isProduction,
    isDevelopment,
    isTest,

    // Bot Services
    meetBotUrl: MEET_BOT_URL ?? BOT_SERVICE_URL ?? DEFAULTS.meetBotUrl,
    botName: BOT_NAME ?? DEFAULTS.botName,
    meetingBaasApiKey: MEETINGBAAS_API_KEY ?? DEFAULTS.meetingBaasApiKey,

    // Storage
    s3Bucket: S3_BUCKET,
    s3Region: AWS_REGION ?? DEFAULTS.s3Region,
    awsAccessKeyId: AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: AWS_SECRET_ACCESS_KEY,
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_KEY,
    hasS3Storage: Boolean(S3_BUCKET && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY),
    hasSupabaseStorage: Boolean(SUPABASE_URL && SUPABASE_KEY),

    // LiveKit & Real-Time Video
    livekitApiKey: resolvedLiveKitApiKey,
    livekitApiSecret: resolvedLiveKitApiSecret,
    livekitWsUrl: resolvedLiveKitWsUrl,
    isLiveKitConfigured,

    // AI & Speech Services
    openaiApiKey: OPENAI_API_KEY,
    groqApiKey: GROQ_API_KEY,
    hasOpenAI: Boolean(OPENAI_API_KEY && OPENAI_API_KEY.trim().length > 10 && !OPENAI_API_KEY.includes("your-openai")),
    hasGroq: Boolean(GROQ_API_KEY && GROQ_API_KEY.trim().length > 10),
    chromaDbUrl: CHROMADB_URL ?? DEFAULTS.chromaDbUrl,
    kafkaBootstrapServers: KAFKA_BOOTSTRAP_SERVERS ?? DEFAULTS.kafkaBootstrapServers,

    // Email & Notifications
    resendApiKey: RESEND_API_KEY,
    emailFrom: EMAIL_FROM ?? DEFAULTS.emailFrom,
    hasEmailService: Boolean(RESEND_API_KEY && RESEND_API_KEY.trim().length > 5),

    // Webhooks & Redis
    n8nWebhookSecret: N8N_WEBHOOK_SECRET ?? DEFAULTS.n8nWebhookSecret,
    appUrl: NEXT_PUBLIC_APP_URL ?? DEFAULTS.appUrl,
    redisHost: REDIS_HOST ?? DEFAULTS.redisHost,
    redisUrl: REDIS_URL ?? DEFAULTS.redisUrl,
    redisPort: REDIS_PORT ? parseInt(REDIS_PORT, 10) : DEFAULTS.redisPort,
    redisPassword: REDIS_PASSWORD,

    // Next.js
    nextRuntime: NEXT_RUNTIME,
  };
}

// ─── Singleton Accessor ──────────────────────────────────────────────────────

let _config: Config | null = null;

export function getConfig(): Config {
  if (!_config) {
    _config = createConfig({
      DATABASE_URL: process.env.DATABASE_URL,
      DIRECT_URL: process.env.DIRECT_URL,
      NODE_ENV: process.env.NODE_ENV,
      MEET_BOT_URL: process.env.MEET_BOT_URL,
      BOT_SERVICE_URL: process.env.BOT_SERVICE_URL,
      BOT_NAME: process.env.BOT_NAME,
      MEETINGBAAS_API_KEY: process.env.MEETINGBAAS_API_KEY,
      S3_BUCKET: process.env.S3_BUCKET,
      AWS_REGION: process.env.AWS_REGION,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_KEY: process.env.SUPABASE_KEY,
      LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
      NEXT_PUBLIC_LIVEKIT_URL: process.env.NEXT_PUBLIC_LIVEKIT_URL,
      LIVEKIT_URL: process.env.LIVEKIT_URL,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      GROQ_API_KEY: process.env.GROQ_API_KEY,
      CHROMADB_URL: process.env.CHROMADB_URL,
      KAFKA_BOOTSTRAP_SERVERS: process.env.KAFKA_BOOTSTRAP_SERVERS,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      EMAIL_FROM: process.env.EMAIL_FROM,
      N8N_WEBHOOK_SECRET: process.env.N8N_WEBHOOK_SECRET,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      REDIS_HOST: process.env.REDIS_HOST,
      REDIS_URL: process.env.REDIS_URL,
      REDIS_PORT: process.env.REDIS_PORT,
      REDIS_PASSWORD: process.env.REDIS_PASSWORD,
      NEXT_RUNTIME: process.env.NEXT_RUNTIME,
    });
  }
  return _config;
}

// ─── Exported Config Instance ────────────────────────────────────────────────

export const config = getConfig();
