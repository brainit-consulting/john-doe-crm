import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  date,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ──────────────────────────────────────────────────────────────────
// Better-Auth core tables (names + column shapes match Better-Auth's
// Drizzle adapter expectations as of v1.6.11).
// ──────────────────────────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("viewer"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ──────────────────────────────────────────────────────────────────
// Demo feature — notes
// ──────────────────────────────────────────────────────────────────

export const notes = pgTable(
  "notes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    byUserCreated: index("notes_by_user_created_idx").on(t.userId, t.createdAt),
  }),
);

export const attachment = pgTable(
  "attachment",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    noteId: text("note_id").references(() => notes.id, {
      onDelete: "cascade",
    }),
    url: text("url").notNull(),
    pathname: text("pathname").notNull(),
    size: integer("size").notNull(),
    contentType: text("content_type").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    byUserNote: index("attachment_by_user_note_idx").on(t.userId, t.noteId),
  }),
);

export const userRelations = relations(user, ({ many }) => ({
  notes: many(notes),
  attachments: many(attachment),
}));

export const notesRelations = relations(notes, ({ one, many }) => ({
  user: one(user, { fields: [notes.userId], references: [user.id] }),
  attachments: many(attachment),
}));

export const attachmentRelations = relations(attachment, ({ one }) => ({
  user: one(user, { fields: [attachment.userId], references: [user.id] }),
  note: one(notes, { fields: [attachment.noteId], references: [notes.id] }),
}));

export type User = typeof user.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type Attachment = typeof attachment.$inferSelect;
export type NewAttachment = typeof attachment.$inferInsert;

// ──────────────────────────────────────────────────────────────────
// John Doe CRM — lead → client → project → invoice (spec §3, §7)
// ──────────────────────────────────────────────────────────────────

export const leadSource = pgEnum("lead_source", ["referral", "web", "event", "cold"]);
export const leadStatus = pgEnum("lead_status", ["new", "contacted", "qualified", "won", "lost"]);
export const projectStatus = pgEnum("project_status", ["proposed", "active", "on_hold", "delivered"]);
export const invoiceStatus = pgEnum("invoice_status", ["draft", "sent", "paid", "overdue"]);
export const activitySubject = pgEnum("activity_subject", ["lead", "client", "project"]);
export const activityKind = pgEnum("activity_kind", ["call", "email", "meeting", "note", "stage_change"]);

// Global Web Crypto (Node 20+/edge/browser) — no import, so schema stays client-bundle-safe.
const pk = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());

export const leads = pgTable(
  "leads",
  {
    id: pk(),
    name: text("name").notNull(),
    company: text("company"),
    email: text("email"),
    phone: text("phone"),
    source: leadSource("source").notNull().default("web"),
    estValue: numeric("est_value", { precision: 12, scale: 2 }),
    score: integer("score").notNull().default(0),
    status: leadStatus("status").notNull().default("new"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
  },
  (t) => ({
    byOwnerStatus: index("leads_by_owner_status_idx").on(t.ownerId, t.status),
  }),
);

export const clients = pgTable("clients", {
  id: pk(),
  leadId: text("lead_id").references(() => leads.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  company: text("company"),
  billingEmail: text("billing_email"),
  address: text("address"),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const projects = pgTable(
  "projects",
  {
    id: pk(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: projectStatus("status").notNull().default("proposed"),
    startDate: date("start_date"),
    dueDate: date("due_date"),
    fee: numeric("fee", { precision: 12, scale: 2 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ byClient: index("projects_by_client_idx").on(t.clientId) }),
);

export const invoices = pgTable(
  "invoices",
  {
    id: pk(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    status: invoiceStatus("status").notNull().default("draft"),
    issueDate: date("issue_date"),
    dueDate: date("due_date"),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
    tax: numeric("tax", { precision: 12, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    byClientStatus: index("invoices_by_client_status_idx").on(t.clientId, t.status),
  }),
);

export const invoiceLines = pgTable("invoice_lines", {
  id: pk(),
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
});

export const activities = pgTable(
  "activities",
  {
    id: pk(),
    subjectType: activitySubject("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    kind: activityKind("kind").notNull(),
    body: text("body").notNull().default(""),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    bySubject: index("activities_by_subject_idx").on(
      t.subjectType,
      t.subjectId,
      t.createdAt,
    ),
  }),
);

export const voiceNotes = pgTable("voice_notes", {
  id: pk(),
  activityId: text("activity_id")
    .notNull()
    .references(() => activities.id, { onDelete: "cascade" }),
  transcript: text("transcript").notNull().default(""),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const leadsRelations = relations(leads, ({ one }) => ({
  owner: one(user, { fields: [leads.ownerId], references: [user.id] }),
  client: one(clients, { fields: [leads.id], references: [clients.leadId] }),
}));
export const clientsRelations = relations(clients, ({ one, many }) => ({
  originLead: one(leads, { fields: [clients.leadId], references: [leads.id] }),
  projects: many(projects),
  invoices: many(invoices),
}));
export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, { fields: [projects.clientId], references: [clients.id] }),
  invoices: many(invoices),
}));
export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  client: one(clients, { fields: [invoices.clientId], references: [clients.id] }),
  project: one(projects, { fields: [invoices.projectId], references: [projects.id] }),
  lines: many(invoiceLines),
}));
export const invoiceLinesRelations = relations(invoiceLines, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceLines.invoiceId], references: [invoices.id] }),
}));
export const activitiesRelations = relations(activities, ({ one, many }) => ({
  author: one(user, { fields: [activities.createdBy], references: [user.id] }),
  voiceNotes: many(voiceNotes),
}));
export const voiceNotesRelations = relations(voiceNotes, ({ one }) => ({
  activity: one(activities, { fields: [voiceNotes.activityId], references: [activities.id] }),
}));

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type InvoiceLine = typeof invoiceLines.$inferSelect;
export type NewInvoiceLine = typeof invoiceLines.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type VoiceNote = typeof voiceNotes.$inferSelect;
export type NewVoiceNote = typeof voiceNotes.$inferInsert;
