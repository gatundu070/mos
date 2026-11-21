import * as z from "zod";
import dotenv from "dotenv";

dotenv.config();

export const envSchema = z.object({
  PORT: z.coerce
    .number<string>()
    .min(1, { error: "PORT min value is 1" })
    .max(65535, { error: "PORT max value is 65535" }),

  DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    error: "DATABASE_URL must start with postgres:// or postgresql://",
  }),

  REDIS_URL: z.url({
    protocol: /^rediss?$/,
    error: "REDIS_URL must start with redis:// or rediss://",
  }),
});

const { success, data, error } = envSchema.safeParse(process.env);

if (!success) {
  console.error("Failed to load env variables:", error.issues[0]);
  process.exit();
}

console.log("All env varibles were loaded successfully");

export const ENV = Object.freeze(data);
