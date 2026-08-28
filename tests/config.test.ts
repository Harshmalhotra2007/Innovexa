import { createConfig, config, Config } from "../src/lib/config";

describe("Centralized Configuration Module (src/lib/config.ts)", () => {
  it("should provide valid defaults when optional environment variables are missing", () => {
    const customConfig = createConfig({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/testdb",
      DIRECT_URL: "postgresql://user:pass@localhost:5432/testdb_direct",
      NODE_ENV: "test",
    });

    expect(customConfig.databaseUrl).toBe("postgresql://user:pass@localhost:5432/testdb");
    expect(customConfig.directUrl).toBe("postgresql://user:pass@localhost:5432/testdb_direct");
    expect(customConfig.nodeEnv).toBe("test");
    expect(customConfig.isTest).toBe(true);
    expect(customConfig.isProduction).toBe(false);

    // Default bot and LiveKit values
    expect(customConfig.botName).toBe("Innovexa Notetaker");
    expect(customConfig.livekitApiKey).toBe("devkey");
    expect(customConfig.livekitWsUrl).toBe("wss://demo.livekit.cloud");
    expect(customConfig.isLiveKitConfigured).toBe(false);

    // Redis defaults
    expect(customConfig.redisHost).toBe("localhost");
    expect(customConfig.redisPort).toBe(6379);
    expect(customConfig.redisUrl).toBe("redis://localhost:6379");
  });

  it("should accurately compute service availability flags", () => {
    const fullyConfigured = createConfig({
      DATABASE_URL: "postgres://prod",
      DIRECT_URL: "postgres://prod",
      NODE_ENV: "production",
      S3_BUCKET: "my-recordings-bucket",
      AWS_ACCESS_KEY_ID: "AKIA1234567890",
      AWS_SECRET_ACCESS_KEY: "secret123456",
      SUPABASE_URL: "https://supabase.co",
      SUPABASE_KEY: "sb-key-123",
      LIVEKIT_API_KEY: "LK_prod_key",
      LIVEKIT_API_SECRET: "LK_prod_secret",
      LIVEKIT_URL: "wss://my-livekit-server.com",
      OPENAI_API_KEY: "sk-proj-1234567890abcdef1234567890",
      GROQ_API_KEY: "gsk_1234567890abcdef",
      RESEND_API_KEY: "re_1234567890",
    });

    expect(fullyConfigured.isProduction).toBe(true);
    expect(fullyConfigured.hasS3Storage).toBe(true);
    expect(fullyConfigured.hasSupabaseStorage).toBe(true);
    expect(fullyConfigured.isLiveKitConfigured).toBe(true);
    expect(fullyConfigured.hasOpenAI).toBe(true);
    expect(fullyConfigured.hasGroq).toBe(true);
    expect(fullyConfigured.hasEmailService).toBe(true);
  });

  it("should evaluate isLiveKitConfigured to false for demo placeholder URLs", () => {
    const demoConfig = createConfig({
      LIVEKIT_API_KEY: "LK_key",
      LIVEKIT_API_SECRET: "LK_secret",
      LIVEKIT_URL: "wss://demo.livekit.cloud",
    });

    expect(demoConfig.isLiveKitConfigured).toBe(false);
  });

  it("should export a stable singleton config object", () => {
    expect(config).toBeDefined();
    expect(typeof config.livekitWsUrl).toBe("string");
    expect(typeof config.redisPort).toBe("number");
    expect(typeof config.appUrl).toBe("string");
  });
});
