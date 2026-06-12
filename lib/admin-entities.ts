/**
 * Config-driven admin CRUD: one whitelist shared by the server action
 * (validation + permission) and the client panel (form rendering).
 */

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "bool"
  | "date"
  | "select"
  | "tags"
  | "image" // uploaded to the public media bucket; stores the URL
  | "ref";  // uuid reference; options provided by the page (selectOptions)

const ICONS = [
  "globe", "smartphone", "building-2", "layers", "bot", "cloud", "cpu",
  "sparkles", "brain-circuit", "workflow", "server", "database", "shield",
  "code", "zap", "rocket",
];

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
}

export interface EntityDef {
  table: string;
  /** Permission scope checked at 'write' level for mutations. */
  perm: string;
  titleField: string;
  fields: FieldDef[];
  orderBy?: string;
  /** Column stamped with the acting user's id on insert. */
  authorField?: string;
}

export const ENTITIES: Record<string, EntityDef> = {
  services: {
    table: "services",
    perm: "website",
    titleField: "title",
    orderBy: "sort_order",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text", required: true },
      { name: "summary", label: "Summary", type: "textarea" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "icon", label: "Icon", type: "select", options: ICONS },
      { name: "offerings", label: "Offerings (comma separated, shown as A | B | C)", type: "tags" },
      { name: "tech_intro", label: "Technology intro text", type: "textarea" },
      { name: "technologies", label: "Technologies (comma separated)", type: "tags" },
      { name: "sort_order", label: "Sort order", type: "number" },
      { name: "is_published", label: "Published", type: "bool" },
    ],
  },
  capabilities: {
    table: "capabilities",
    perm: "website",
    titleField: "title",
    orderBy: "sort_order",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "icon", label: "Icon", type: "select", options: ICONS },
      { name: "sort_order", label: "Sort order", type: "number" },
      { name: "is_published", label: "Published", type: "bool" },
    ],
  },
  case_studies: {
    table: "case_studies",
    perm: "website",
    titleField: "title",
    orderBy: "sort_order",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text", required: true },
      { name: "service_id", label: "Service", type: "ref" },
      { name: "client_name", label: "Client name", type: "text" },
      { name: "cover_url", label: "Image", type: "image" },
      { name: "summary", label: "Summary", type: "textarea" },
      { name: "body", label: "Content", type: "textarea" },
      { name: "technologies", label: "Technologies used (comma separated)", type: "tags" },
      { name: "sort_order", label: "Sort order", type: "number" },
      { name: "is_published", label: "Published", type: "bool" },
    ],
  },
  testimonials: {
    table: "testimonials",
    perm: "website",
    titleField: "author",
    orderBy: "sort_order",
    fields: [
      { name: "author", label: "Author", type: "text", required: true },
      { name: "company", label: "Company / role", type: "text" },
      { name: "quote", label: "Quote", type: "textarea", required: true },
      { name: "sort_order", label: "Sort order", type: "number" },
      { name: "is_published", label: "Published", type: "bool" },
    ],
  },
  blog_posts: {
    table: "blog_posts",
    perm: "website",
    titleField: "title",
    orderBy: "published_at",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text", required: true },
      { name: "excerpt", label: "Excerpt", type: "textarea" },
      { name: "body", label: "Body", type: "textarea" },
    ],
  },
  faqs: {
    table: "faqs",
    perm: "website",
    titleField: "question",
    orderBy: "sort_order",
    fields: [
      { name: "question", label: "Question", type: "text", required: true },
      { name: "answer", label: "Answer", type: "textarea", required: true },
      { name: "sort_order", label: "Sort order", type: "number" },
      { name: "is_published", label: "Published", type: "bool" },
    ],
  },
  job_posts: {
    table: "job_posts",
    perm: "recruitment",
    titleField: "title",
    orderBy: "sort_order",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "department", label: "Department", type: "text" },
      { name: "location", label: "Location", type: "text" },
      { name: "employment_type", label: "Type", type: "select", options: ["Full-time", "Part-time", "Contract"] },
      { name: "description", label: "Description", type: "textarea" },
      { name: "requirements", label: "Requirements", type: "textarea" },
      { name: "salary_range", label: "Salary range", type: "text" },
      { name: "sort_order", label: "Sort order", type: "number" },
      { name: "is_open", label: "Open", type: "bool" },
    ],
  },
  candidates: {
    table: "candidates",
    perm: "recruitment",
    titleField: "name",
    orderBy: "created_at",
    fields: [
      { name: "status", label: "Status", type: "select", options: ["applied", "screening", "interview", "offer", "hired", "rejected"], required: true },
      { name: "note", label: "Internal note", type: "textarea" },
    ],
  },
  clients: {
    table: "clients",
    perm: "clients",
    titleField: "name",
    orderBy: "created_at",
    fields: [
      { name: "name", label: "Contact name", type: "text", required: true },
      { name: "company", label: "Company", type: "text" },
      { name: "email", label: "Email", type: "text" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "website", label: "Website", type: "text" },
      { name: "status", label: "Status", type: "select", options: ["lead", "active", "past"] },
      { name: "note", label: "Note", type: "textarea" },
    ],
  },
  contact_inquiries: {
    table: "contact_inquiries",
    perm: "clients",
    titleField: "name",
    orderBy: "created_at",
    fields: [
      { name: "status", label: "Status", type: "select", options: ["new", "replied", "closed"], required: true },
    ],
  },
  invoices: {
    table: "invoices",
    perm: "finance",
    titleField: "number",
    orderBy: "issued_date",
    fields: [
      { name: "number", label: "Invoice #", type: "text", required: true },
      { name: "amount", label: "Amount", type: "number", required: true },
      { name: "status", label: "Status", type: "select", options: ["draft", "sent", "paid"] },
      { name: "issued_date", label: "Issued", type: "date" },
      { name: "due_date", label: "Due", type: "date" },
      { name: "paid_date", label: "Paid on", type: "date" },
      { name: "note", label: "Note", type: "textarea" },
    ],
  },
  payments: {
    table: "payments",
    perm: "finance",
    titleField: "amount",
    orderBy: "received_date",
    fields: [
      { name: "amount", label: "Amount", type: "number", required: true },
      { name: "received_date", label: "Received", type: "date", required: true },
      { name: "method", label: "Method", type: "select", options: ["bank", "card", "cash", "other"] },
      { name: "note", label: "Note", type: "textarea" },
    ],
  },
  expenses: {
    table: "expenses",
    perm: "finance",
    titleField: "category",
    orderBy: "spent_date",
    fields: [
      { name: "category", label: "Category", type: "select", options: ["General", "Software", "Hardware", "Office", "Travel", "Marketing", "Other"] },
      { name: "amount", label: "Amount", type: "number", required: true },
      { name: "spent_date", label: "Date", type: "date", required: true },
      { name: "description", label: "Description", type: "textarea" },
    ],
  },
  announcements: {
    table: "announcements",
    perm: "announcements",
    titleField: "title",
    orderBy: "published_at",
    authorField: "created_by",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "body", label: "Body", type: "textarea", required: true },
    ],
  },
  kb_articles: {
    table: "kb_articles",
    perm: "kb",
    titleField: "title",
    orderBy: "updated_at",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "category", label: "Category", type: "text" },
      { name: "body", label: "Body", type: "textarea", required: true },
    ],
  },
  leave_types: {
    table: "leave_types",
    perm: "attendance",
    titleField: "name",
    orderBy: "sort_order",
    fields: [
      { name: "name", label: "Reason name", type: "text", required: true },
      { name: "is_paid", label: "Paid by default", type: "bool" },
      { name: "requires_time", label: "Needs a time (early-leave style)", type: "bool" },
      { name: "single_day", label: "Single day (one date, no range)", type: "bool" },
      { name: "sort_order", label: "Sort order", type: "number" },
    ],
  },
  departments: {
    table: "departments",
    perm: "staff",
    titleField: "name",
    fields: [{ name: "name", label: "Name", type: "text", required: true }],
  },
};
