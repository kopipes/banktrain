import { sql } from "drizzle-orm";
import {
  text,
  integer,
  real,
  sqliteTable,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

// ── Users ─────────────────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "mentor", "trainee"] })
    .notNull()
    .default("trainee"),
  division: text("division").notNull().default("general"),
  avatarUrl: text("avatar_url"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ── AI Models ─────────────────────────────────────────────────────────────────
export const aiModels = sqliteTable("ai_models", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),         // e.g. "openai", "together", "custom"
  baseUrl: text("base_url").notNull(),          // fully qualified API endpoint
  apiKey: text("api_key").notNull(),            // encrypted at rest (env-managed)
  modelId: text("model_id").notNull(),          // model identifier string
  type: text("type", { enum: ["image", "llm"] }).notNull().default("image"),
  pricePerToken: real("price_per_token").notNull().default(0), // IDR per token
  pricePerImage: real("price_per_image").notNull().default(0), // IDR per image
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ── Division Quotas ───────────────────────────────────────────────────────────
export const divisionQuotas = sqliteTable(
  "division_quotas",
  {
    id: text("id").primaryKey(),
    division: text("division").notNull(),
    monthlyBudgetIdr: real("monthly_budget_idr").notNull().default(0),
    usedBudgetIdr: real("used_budget_idr").notNull().default(0),
    monthYear: text("month_year").notNull(), // "YYYY-MM"
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    // One row per (division, month) — allows historical records across months
    divisionMonthIdx: uniqueIndex("division_month_year_idx").on(t.division, t.monthYear),
  })
);

// ── Generations ───────────────────────────────────────────────────────────────
export const generations = sqliteTable(
  "generations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    modelId: text("model_id")
      .notNull()
      .references(() => aiModels.id),
    // Hybrid prompt components
    subject: text("subject"),
    action: text("action"),
    environment: text("environment"),
    lighting: text("lighting"),
    style: text("style"),
    colorPalette: text("color_palette"),
    negativePrompt: text("negative_prompt"),
    fullPrompt: text("full_prompt").notNull(),
    // Generation parameters
    seed: integer("seed"),
    cfgScale: real("cfg_scale"),
    steps: integer("steps"),
    aspectRatio: text("aspect_ratio"),
    width: integer("width"),
    height: integer("height"),
    // Output
    imageUrl: text("image_url"),
    imageKey: text("image_key"), // storage key (local or R2)
    // Cost tracking — extracted directly from API response metadata
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    costIdr: real("cost_idr").notNull().default(0),
    rawUsageMetadata: text("raw_usage_metadata"), // JSON string of full API usage object
    // Status
    status: text("status", { enum: ["pending", "success", "error"] })
      .notNull()
      .default("pending"),
    errorMessage: text("error_message"),
    // Visibility
    isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
    isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    userIdx: index("generations_user_idx").on(t.userId),
    createdAtIdx: index("generations_created_at_idx").on(t.createdAt),
    publicIdx: index("generations_public_idx").on(t.isPublic),
  })
);

// ── Token Logs ────────────────────────────────────────────────────────────────
export const tokenLogs = sqliteTable(
  "token_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    generationId: text("generation_id").references(() => generations.id),
    division: text("division").notNull(),
    modelId: text("model_id").notNull(),
    totalTokens: integer("total_tokens").notNull().default(0),
    costIdr: real("cost_idr").notNull().default(0),
    type: text("type", { enum: ["image", "llm"] }).notNull().default("image"),
    monthYear: text("month_year").notNull(), // "YYYY-MM"
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    userIdx: index("token_logs_user_idx").on(t.userId),
    divisionMonthIdx: index("token_logs_division_month_idx").on(t.division, t.monthYear),
  })
);

// ── Prompt Library ────────────────────────────────────────────────────────────
export const promptLibrary = sqliteTable(
  "prompt_library",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    generationId: text("generation_id").references(() => generations.id),
    title: text("title").notNull(),
    description: text("description"),
    fullPrompt: text("full_prompt").notNull(),
    negativePrompt: text("negative_prompt"),
    tags: text("tags"), // JSON array string
    style: text("style"),
    cfgScale: real("cfg_scale"),
    steps: integer("steps"),
    aspectRatio: text("aspect_ratio"),
    imageUrl: text("image_url"),
    forkedFromId: text("forked_from_id"), // self-reference for remix/fork
    likes: integer("likes").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    likesCreatedAtIdx: index("prompt_library_likes_idx").on(t.likes, t.createdAt),
  })
);

// ── Challenges ────────────────────────────────────────────────────────────────
export const challenges = sqliteTable("challenges", {
  id: text("id").primaryKey(),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  objectives: text("objectives").notNull(), // JSON array string
  referenceImageUrl: text("reference_image_url"),
  difficulty: text("difficulty", { enum: ["beginner", "intermediate", "advanced"] })
    .notNull()
    .default("beginner"),
  category: text("category").notNull().default("general"), // e.g. "character", "spatial"
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ── Challenge Submissions ─────────────────────────────────────────────────────
export const challengeSubmissions = sqliteTable("challenge_submissions", {
  id: text("id").primaryKey(),
  challengeId: text("challenge_id")
    .notNull()
    .references(() => challenges.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  generationId: text("generation_id").references(() => generations.id),
  notes: text("notes"),
  score: integer("score"), // mentor-assigned 0-100
  mentorFeedback: text("mentor_feedback"),
  status: text("status", { enum: ["submitted", "reviewed", "passed"] })
    .notNull()
    .default("submitted"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ── User Telemetry ────────────────────────────────────────────────────────────
export const userTelemetry = sqliteTable("user_telemetry", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  event: text("event").notNull(), // e.g. "generation_success", "style_used"
  payload: text("payload"), // JSON string
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ── Negative Prompt Profiles ──────────────────────────────────────────────────
export const negativePromptProfiles = sqliteTable("negative_prompt_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  keywords: text("keywords").notNull().default("[]"), // JSON array
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ── Types ─────────────────────────────────────────────────────────────────────
// ── App Settings ─────────────────────────────────────────────────────────────
// Key/value store for app-wide admin-controlled feature flags.
// Each row is one setting: key (unique), value (JSON string), updatedAt.
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(), // JSON-encoded value
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AiModel = typeof aiModels.$inferSelect;
export type NewAiModel = typeof aiModels.$inferInsert;
export type Generation = typeof generations.$inferSelect;
export type NewGeneration = typeof generations.$inferInsert;
export type TokenLog = typeof tokenLogs.$inferSelect;
export type Challenge = typeof challenges.$inferSelect;
export type ChallengeSubmission = typeof challengeSubmissions.$inferSelect;
export type PromptLibraryEntry = typeof promptLibrary.$inferSelect;
export type DivisionQuota = typeof divisionQuotas.$inferSelect;
export type AppSetting = typeof appSettings.$inferSelect;
