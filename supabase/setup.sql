-- =============================================================
-- Sonex-Digital - Company Site + ERP - COMPLETE DATABASE SETUP
-- ONE file: schema + permissions + RLS + triggers + site content.
-- Run this whole file once in the Supabase SQL editor on an
-- EMPTY database (no tables). Then run `npm run seed` locally
-- to create the COO account. Everyone else self-registers.
--
-- Access model (3 layers; this file is layer 3):
--   role decides default access (role_permissions)
--   per-user overrides win (user_permissions, level 'none' = revoke)
--   COO role bypasses everything (super admin)
--   permission levels: none < read < write
-- Status gates (enforced by triggers, not only the UI):
--   task -> done: project owner only | project/milestone -> paid:
--   CTO/COO only | blog approve: super admin only | archive = trash.
-- =============================================================

create extension if not exists "pgcrypto";

-- If the public schema was ever dropped and recreated, the Supabase
-- default API grants are lost - restore them (harmless otherwise).
grant usage on schema public to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;


-- ---------------- enums --------------------------------------
create type perm_level as enum ('none', 'read', 'write');
create type project_status as enum ('todo', 'in_progress', 'review', 'done', 'paid');
create type task_status as enum ('todo', 'progress', 'review', 'done');
create type repeat_type as enum ('none','daily','weekly','monthly','workdays','weekends','custom');
create type leave_status as enum ('pending', 'approved', 'rejected');
create type salary_status as enum ('draft', 'confirmed', 'paid');
create type candidate_status as enum ('applied','screening','interview','offer','hired','rejected');

-- ---------------- shared updated_at trigger ------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- =============================================================
-- CORE: roles, permissions, departments, profiles
-- =============================================================

create table roles (
  id           uuid primary key default gen_random_uuid(),
  name         text unique not null,          -- 'coo','ceo','cto','hr','finance','pm','staff'
  display_name text not null,
  is_system    boolean not null default false,
  created_at   timestamptz not null default now()
);

create table permissions (
  code  text primary key,                     -- 'projects', 'finance', 'projects.mark_paid', ...
  label text not null
);

create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  code    text not null references permissions(code) on delete cascade,
  level   perm_level not null check (level <> 'none'),
  primary key (role_id, code)
);

create table departments (
  id   uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text unique not null,
  full_name     text not null,
  role_id       uuid not null references roles(id),
  department_id uuid references departments(id) on delete set null,
  phone         text,
  avatar_url    text,
  bio           text not null default '',
  birthday      date,
  timezone      text not null default 'Asia/Tokyo',
  work_start    time not null default '09:00',  -- local working hours
  work_end      time not null default '18:00',  -- (window may cross midnight)
  is_active     boolean not null default true,
  joined_at     date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

create table user_permissions (
  user_id uuid not null references profiles(id) on delete cascade,
  code    text not null references permissions(code) on delete cascade,
  level   perm_level not null,                -- 'none' = explicit revoke
  primary key (user_id, code)
);

-- ---------------- permission helpers -------------------------

create or replace function perm_rank(l perm_level)
returns int language sql immutable as $$
  select case l when 'none' then 0 when 'read' then 1 else 2 end
$$;

-- Resolution: COO -> true; user override; role grant; deny.
create or replace function has_perm(p_code text, p_need perm_level)
returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_role  text;
  v_level perm_level;
begin
  if v_uid is null then return false; end if;
  select r.name into v_role
    from profiles p join roles r on r.id = p.role_id
   where p.id = v_uid and p.is_active;
  if v_role is null then return false; end if;
  if v_role = 'coo' then return true; end if;

  select level into v_level from user_permissions
   where user_id = v_uid and code = p_code;
  if found then return perm_rank(v_level) >= perm_rank(p_need); end if;

  select rp.level into v_level
    from role_permissions rp
    join profiles p on p.role_id = rp.role_id
   where p.id = v_uid and rp.code = p_code;
  if found then return perm_rank(v_level) >= perm_rank(p_need); end if;

  return false;
end $$;

create or replace function my_role()
returns text language sql stable security definer set search_path = public as $$
  select r.name from profiles p join roles r on r.id = p.role_id
   where p.id = auth.uid() and p.is_active
$$;

-- Profiles: a user may edit own row, but never own role/active/email.
create or replace function guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;     -- service role / seed
  if has_perm('staff', 'write') then return new; end if;
  if new.role_id is distinct from old.role_id
     or new.is_active is distinct from old.is_active
     or new.email is distinct from old.email
     or new.department_id is distinct from old.department_id
     or new.joined_at is distinct from old.joined_at then
    raise exception 'Not allowed to change role / status fields';
  end if;
  return new;
end $$;
create trigger trg_profiles_guard before update on profiles
  for each row execute function guard_profile_update();

-- =============================================================
-- WEBSITE (public site content, managed from the CMS)
-- =============================================================

create table site_content (
  key        text primary key,                -- 'home.hero', 'about.story', ...
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
create trigger trg_site_content_updated before update on site_content
  for each row execute function set_updated_at();

-- Public About-page leadership cards (COO toggles via site_content
-- 'about.leadership'); anon-safe: never exposes the profiles table.
create or replace function public_leadership()
returns table (role_name text, full_name text, avatar_url text, bio text)
language sql stable security definer set search_path = public as $$
  select r.name, p.full_name, p.avatar_url, p.bio
    from profiles p
    join roles r on r.id = p.role_id
   where p.is_active
     and r.name in ('ceo', 'cto')
     and coalesce(
       ((select value from site_content where key = 'about.leadership')
          ->> ('show_' || r.name))::boolean,
       true)
   order by case r.name when 'ceo' then 1 else 2 end
$$;
revoke all on function public_leadership from public;
grant execute on function public_leadership to anon, authenticated;

create table services (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  summary      text not null default '',
  description  text not null default '',
  icon         text not null default 'code',  -- lucide icon name
  offerings    text[] not null default '{}',  -- "Custom Websites | E-commerce | ..."
  tech_intro   text not null default '',
  technologies text[] not null default '{}',  -- tech chips
  sort_order   int not null default 0,
  is_published boolean not null default true
);

create table capabilities (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text not null default '',
  icon         text not null default 'cpu',   -- lucide icon name
  sort_order   int not null default 0,
  is_published boolean not null default true
);

create table case_studies (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  client_name  text not null default '',
  category     text not null default 'Web',
  summary      text not null default '',
  body         text not null default '',
  cover_url    text,
  tags         text[] not null default '{}',
  service_id   uuid references services(id) on delete set null,
  technologies text[] not null default '{}',
  sort_order   int not null default 0,
  is_published boolean not null default true
);

create table testimonials (
  id           uuid primary key default gen_random_uuid(),
  author       text not null,
  company      text not null default '',
  quote        text not null,
  sort_order   int not null default 0,
  is_published boolean not null default true
);

create table blog_posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  excerpt      text not null default '',
  body         text not null default '',
  cover_url    text,
  author_id    uuid references profiles(id) on delete set null,
  author_name  text not null default 'Sonex-Digital Team',
  is_published boolean not null default true,
  approval_status text not null default 'pending'
    check (approval_status in ('draft', 'pending', 'approved', 'rejected')),
  review_note  text,
  published_at timestamptz not null default now()
);

create table faqs (
  id           uuid primary key default gen_random_uuid(),
  page         text not null default 'home' check (page in ('home','services','careers','contact')),
  question     text not null,
  answer       text not null,
  sort_order   int not null default 0,
  is_published boolean not null default true
);

create table contact_inquiries (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  company    text,
  phone      text,
  message    text not null,
  status     text not null default 'new' check (status in ('new','replied','closed')),
  created_at timestamptz not null default now()
);

create table job_posts (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  department      text not null default '',
  location        text not null default 'Remote',
  employment_type text not null default 'Full-time',
  description     text not null default '',
  requirements    text not null default '',
  salary_range    text,
  is_open         boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

create table candidates (
  id           uuid primary key default gen_random_uuid(),
  job_post_id  uuid references job_posts(id) on delete set null,
  name         text not null,
  email        text not null,
  phone        text,
  resume_url   text,
  cover_letter text,
  status       candidate_status not null default 'applied',
  note         text,
  created_at   timestamptz not null default now()
);

-- =============================================================
-- CLIENTS
-- =============================================================

create table clients (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  company    text not null default '',
  email      text,
  phone      text,
  website    text,
  status     text not null default 'active' check (status in ('lead','active','past')),
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_clients_updated before update on clients
  for each row execute function set_updated_at();

create table client_contacts (
  id        uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name      text not null,
  role      text,
  email     text,
  phone     text
);

-- =============================================================
-- PROJECTS / TASKS
-- =============================================================

create table projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  client_id   uuid references clients(id) on delete set null,
  owner_id    uuid not null references profiles(id),
  status      project_status not null default 'todo',
  deadline    date,
  amount      numeric(12,2) not null default 0,
  sort_order  int not null default 0,
  is_archived boolean not null default false,
  archived_at timestamptz,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_projects_owner on projects(owner_id);
create index idx_projects_client on projects(client_id);
create trigger trg_projects_updated before update on projects
  for each row execute function set_updated_at();

create table project_members (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  added_by   uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);
create index idx_pm_project on project_members(project_id);
create index idx_pm_user on project_members(user_id);

create table project_milestones (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title      text not null,
  status     project_status not null default 'todo',
  deadline   date,
  amount     numeric(12,2) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_ms_project on project_milestones(project_id);
create trigger trg_milestones_updated before update on project_milestones
  for each row execute function set_updated_at();

create table tasks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  milestone_id uuid references project_milestones(id) on delete set null,
  title        text not null,
  description  text not null default '',
  status       task_status not null default 'todo',
  is_urgent    boolean not null default false,
  is_important boolean not null default false,
  assignee_id  uuid references profiles(id) on delete set null,
  due_date     date,
  sort_order   int not null default 0,
  is_archived  boolean not null default false,
  archived_at  timestamptz,
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_tasks_project on tasks(project_id);
create index idx_tasks_assignee on tasks(assignee_id);
create trigger trg_tasks_updated before update on tasks
  for each row execute function set_updated_at();

create table task_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index idx_comments_task on task_comments(task_id);

create table task_attachments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references tasks(id) on delete cascade,
  file_name   text not null,
  file_path   text not null,                  -- path in the private 'files' bucket
  size_bytes  bigint not null default 0,
  uploaded_by uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index idx_attachments_task on task_attachments(task_id);

-- ---------------- project access helpers ---------------------

create or replace function is_project_owner(p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from projects where id = p_project and owner_id = auth.uid())
$$;

create or replace function is_project_member(p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from project_members where project_id = p_project and user_id = auth.uid())
$$;

create or replace function can_view_project(p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_project_owner(p_project)
      or is_project_member(p_project)
      or has_perm('projects', 'read')
$$;

create or replace function can_manage_project(p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_project_owner(p_project) or has_perm('projects', 'write')
$$;

create or replace function task_project(p_task uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select project_id from tasks where id = p_task
$$;

-- Free-staff directory for project owners: every active staff with
-- a count of active (not archived, not paid) projects they belong to.
create or replace function staff_allocation()
returns table (id uuid, full_name text, email text, department text, active_projects bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.email, coalesce(d.name, '') as department,
         (select count(*) from project_members m
            join projects pr on pr.id = m.project_id
           where m.user_id = p.id and not pr.is_archived and pr.status <> 'paid')
         as active_projects
    from profiles p
    left join departments d on d.id = p.department_id
   where p.is_active
     and (has_perm('projects', 'read')
          or exists (select 1 from projects where owner_id = auth.uid() and not is_archived))
   order by active_projects asc, p.full_name asc
$$;

-- ---------------- status-gate triggers ------------------------

create or replace function enforce_project_rules()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;     -- service role
  if (new.status = 'paid') <> (old.status = 'paid')
     and not has_perm('projects.mark_paid', 'write') then
    raise exception 'Only CTO/COO can move a project to or from Paid';
  end if;
  if new.owner_id is distinct from old.owner_id
     and not has_perm('projects', 'write') then
    raise exception 'Only project managers can change the project owner';
  end if;
  if new.is_archived is distinct from old.is_archived
     and not has_perm('projects', 'write') then
    raise exception 'Only project managers can archive projects';
  end if;
  if new.is_archived and not old.is_archived then new.archived_at = now(); end if;
  return new;
end $$;
create trigger trg_projects_rules before update on projects
  for each row execute function enforce_project_rules();

create or replace function enforce_milestone_rules()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if (new.status = 'paid') <> (old.status = 'paid')
     and not has_perm('projects.mark_paid', 'write') then
    raise exception 'Only CTO/COO can mark a milestone Paid';
  end if;
  return new;
end $$;
create trigger trg_milestones_rules before update on project_milestones
  for each row execute function enforce_milestone_rules();

-- When every milestone of a project is Paid, the project becomes Paid.
create or replace function milestone_paid_rollup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'paid' and not exists (
       select 1 from project_milestones
        where project_id = new.project_id and status <> 'paid')
  then
    update projects set status = 'paid' where id = new.project_id and status <> 'paid';
  end if;
  return new;
end $$;
create trigger trg_milestone_rollup after update on project_milestones
  for each row execute function milestone_paid_rollup();

create or replace function enforce_task_rules()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if not can_manage_project(new.project_id) then
    if new.status = 'done' and old.status <> 'done' then
      raise exception 'Only the project owner can move a task to Done';
    end if;
    if old.status = 'done' and new.status <> 'done' then
      raise exception 'Only the project owner can reopen a Done task';
    end if;
    if new.is_archived is distinct from old.is_archived then
      raise exception 'Only the project owner can archive tasks';
    end if;
  end if;
  if new.is_archived and not old.is_archived then new.archived_at = now(); end if;
  return new;
end $$;
create trigger trg_tasks_rules before update on tasks
  for each row execute function enforce_task_rules();

-- ---------------- task -> milestone/project status rollup ----------
-- all todo -> todo | all done -> done | all review/done -> review |
-- else in_progress. Paid and empty (no tasks) are never auto-changed.
create or replace function apply_status_rollup(p_project uuid, p_milestone uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_total       int;
  v_todo        int;
  v_done        int;
  v_review_done int;
  v_cur         project_status;
  v_new         project_status;
begin
  if p_milestone is null then
    select count(*),
           count(*) filter (where status = 'todo'),
           count(*) filter (where status = 'done'),
           count(*) filter (where status in ('review', 'done'))
      into v_total, v_todo, v_done, v_review_done
      from tasks
     where project_id = p_project and not is_archived;
    select status into v_cur from projects
     where id = p_project and not is_archived;
  else
    select count(*),
           count(*) filter (where status = 'todo'),
           count(*) filter (where status = 'done'),
           count(*) filter (where status in ('review', 'done'))
      into v_total, v_todo, v_done, v_review_done
      from tasks
     where milestone_id = p_milestone and not is_archived;
    select status into v_cur from project_milestones where id = p_milestone;
  end if;

  if v_cur is null or v_cur = 'paid' or v_total = 0 then
    return;
  end if;

  v_new := case
    when v_done = v_total        then 'done'::project_status
    when v_review_done = v_total then 'review'::project_status
    when v_todo = v_total        then 'todo'::project_status
    else 'in_progress'::project_status
  end;

  if v_new <> v_cur then
    if p_milestone is null then
      update projects set status = v_new where id = p_project;
    else
      update project_milestones set status = v_new where id = p_milestone;
    end if;
  end if;
end $$;

create or replace function task_status_rollup()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_project uuid;
begin
  v_project := coalesce(new.project_id, old.project_id);

  if tg_op <> 'DELETE' and new.milestone_id is not null then
    perform apply_status_rollup(v_project, new.milestone_id);
  end if;
  -- a task moved off / deleted from a milestone re-rolls the old one
  if tg_op <> 'INSERT' and old.milestone_id is not null
     and (tg_op = 'DELETE' or new.milestone_id is distinct from old.milestone_id) then
    perform apply_status_rollup(v_project, old.milestone_id);
  end if;

  perform apply_status_rollup(v_project, null);
  return coalesce(new, old);
end $$;

drop trigger if exists trg_tasks_rollup on tasks;
create trigger trg_tasks_rollup after insert or update or delete on tasks
  for each row execute function task_status_rollup();

-- =============================================================
-- PERSONAL TASKS (private todolist; recurrence model ported
-- from the proven todolist app: lazy roll-forward)
-- =============================================================

create table personal_tasks (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,
  title             text not null,
  description       text,
  date              date,
  time              time,
  due_date          date,                     -- recurring: end of recurrence
  status            task_status not null default 'todo',
  is_recurring      boolean not null default false,
  repeat_type       repeat_type not null default 'none',
  repeat_interval   int not null default 1,
  is_done_today     boolean not null default false,
  done_today_date   date,
  is_fully_complete boolean not null default false,
  is_urgent         boolean not null default false,
  is_important      boolean not null default false,
  is_archived       boolean not null default false,
  archived_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_personal_user on personal_tasks(user_id);
create trigger trg_personal_updated before update on personal_tasks
  for each row execute function set_updated_at();

create table personal_task_occurrences (
  id              uuid primary key default gen_random_uuid(),
  task_id         uuid not null references personal_tasks(id) on delete cascade,
  occurrence_date date not null,
  is_done         boolean not null default false,
  done_at         timestamptz,
  unique (task_id, occurrence_date)
);

-- =============================================================
-- ATTENDANCE / LEAVE / ANNOUNCEMENTS / KB
-- =============================================================

create table attendance_logs (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references profiles(id) on delete cascade,
  work_date date not null,
  check_in  timestamptz,
  check_out timestamptz,
  status    text not null default 'present' check (status in ('present','late','absent','leave')),
  note      text,
  unique (user_id, work_date)
);
create index idx_attendance_user on attendance_logs(user_id);

create table leave_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  start_date  date not null,
  end_date    date not null,
  type        text not null default 'vacation' check (type in ('vacation','sick','personal','unpaid','early_leave')),
  is_paid     boolean not null default true,
  early_time  time,                              -- early_leave: may check out after this
  reason      text,
  status      leave_status not null default 'pending',
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at  timestamptz not null default now(),
  check (end_date >= start_date)
);
create index idx_leave_user on leave_requests(user_id);

create table announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text not null,
  created_by   uuid references profiles(id) on delete set null,
  published_at timestamptz not null default now()
);

create table kb_articles (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  category   text not null default 'General',
  body       text not null,
  created_by uuid references profiles(id) on delete set null,
  updated_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_kb_updated before update on kb_articles
  for each row execute function set_updated_at();

-- =============================================================
-- FINANCE (record-keeping only) / PAYROLL (calculates)
-- =============================================================

create table invoices (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references clients(id) on delete set null,
  project_id  uuid references projects(id) on delete set null,
  number      text unique not null,
  amount      numeric(12,2) not null,
  status      text not null default 'draft' check (status in ('draft','sent','paid')),
  issued_date date not null default current_date,
  due_date    date,
  paid_date   date,
  note        text
);

create table payments (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid references clients(id) on delete set null,
  project_id    uuid references projects(id) on delete set null,
  invoice_id    uuid references invoices(id) on delete set null,
  amount        numeric(12,2) not null,
  received_date date not null default current_date,
  method        text not null default 'bank',
  note          text
);

create table expenses (
  id          uuid primary key default gen_random_uuid(),
  category    text not null default 'General',
  amount      numeric(12,2) not null,
  spent_date  date not null default current_date,
  description text,
  created_by  uuid references profiles(id) on delete set null
);

create table staff_salaries (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  base_salary    numeric(12,2) not null,
  effective_from date not null,
  created_by     uuid references profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (user_id, effective_from)
);

create table salary_records (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,
  month             date not null,            -- first day of the month
  base              numeric(12,2) not null default 0,
  bonus             numeric(12,2) not null default 0,
  deductions        numeric(12,2) not null default 0,
  absence_deduction numeric(12,2) not null default 0,
  total             numeric(12,2) not null default 0,
  status            salary_status not null default 'draft',
  confirmed_by      uuid references profiles(id) on delete set null,
  confirmed_at      timestamptz,
  paid_at           timestamptz,
  note              text,
  unique (user_id, month)
);

create table salary_adjustments (
  id               uuid primary key default gen_random_uuid(),
  salary_record_id uuid not null references salary_records(id) on delete cascade,
  amount           numeric(12,2) not null,    -- positive bonus / negative deduction
  reason           text not null,
  added_by         uuid references profiles(id) on delete set null,
  created_at       timestamptz not null default now()
);

-- =============================================================
-- NOTIFICATIONS / ACTIVITY
-- =============================================================

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text not null default '',
  link       text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on notifications(user_id, is_read);

create table activity_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete set null,
  project_id uuid references projects(id) on delete cascade,
  task_id    uuid references tasks(id) on delete set null,
  action     text not null,
  old_value  jsonb,
  new_value  jsonb,
  created_at timestamptz not null default now()
);
create index idx_activity_project on activity_logs(project_id);

-- Definer helpers so server actions (running as the user) can
-- notify other users / write the activity feed despite RLS.
create or replace function notify_user(p_user uuid, p_type text, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, type, title, body, link)
  values (p_user, p_type, p_title, coalesce(p_body, ''), p_link)
$$;
revoke all on function notify_user from public;
grant execute on function notify_user to authenticated;

create or replace function log_activity(p_project uuid, p_task uuid, p_action text, p_old jsonb, p_new jsonb)
returns void language sql security definer set search_path = public as $$
  insert into activity_logs (user_id, project_id, task_id, action, old_value, new_value)
  values (auth.uid(), p_project, p_task, p_action, p_old, p_new)
$$;
revoke all on function log_activity from public;
grant execute on function log_activity to authenticated;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

alter table roles                     enable row level security;
alter table permissions               enable row level security;
alter table role_permissions          enable row level security;
alter table user_permissions          enable row level security;
alter table departments               enable row level security;
alter table profiles                  enable row level security;
alter table site_content              enable row level security;
alter table services                  enable row level security;
alter table capabilities              enable row level security;
alter table case_studies              enable row level security;
alter table testimonials              enable row level security;
alter table blog_posts                enable row level security;
alter table faqs                      enable row level security;
alter table contact_inquiries         enable row level security;
alter table job_posts                 enable row level security;
alter table candidates                enable row level security;
alter table clients                   enable row level security;
alter table client_contacts           enable row level security;
alter table projects                  enable row level security;
alter table project_members           enable row level security;
alter table project_milestones        enable row level security;
alter table tasks                     enable row level security;
alter table task_comments             enable row level security;
alter table task_attachments          enable row level security;
alter table personal_tasks            enable row level security;
alter table personal_task_occurrences enable row level security;
alter table attendance_logs           enable row level security;
alter table leave_requests            enable row level security;
alter table announcements             enable row level security;
alter table kb_articles               enable row level security;
alter table invoices                  enable row level security;
alter table payments                  enable row level security;
alter table expenses                  enable row level security;
alter table staff_salaries            enable row level security;
alter table salary_records            enable row level security;
alter table salary_adjustments        enable row level security;
alter table notifications             enable row level security;
alter table activity_logs             enable row level security;

-- ---- core ----------------------------------------------------
create policy roles_read on roles for select to authenticated using (true);
create policy roles_write on roles for all to authenticated
  using (has_perm('permissions','write')) with check (has_perm('permissions','write'));

create policy perms_read on permissions for select to authenticated using (true);

create policy role_perms_read on role_permissions for select to authenticated using (true);
create policy role_perms_write on role_permissions for all to authenticated
  using (has_perm('permissions','write')) with check (has_perm('permissions','write'));

create policy user_perms_read on user_permissions for select to authenticated
  using (user_id = auth.uid() or has_perm('permissions','write'));
create policy user_perms_write on user_permissions for all to authenticated
  using (has_perm('permissions','write')) with check (has_perm('permissions','write'));

create policy departments_read on departments for select to authenticated using (true);
create policy departments_write on departments for all to authenticated
  using (has_perm('staff','write')) with check (has_perm('staff','write'));

-- profiles hold no sensitive data (salary lives in staff_salaries)
create policy profiles_read on profiles for select to authenticated using (true);
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid() or has_perm('staff','write'))
  with check (id = auth.uid() or has_perm('staff','write'));

-- ---- website (public read of published content) ---------------
create policy site_content_read on site_content for select using (true);
create policy site_content_write on site_content for all to authenticated
  using (has_perm('website','write')) with check (has_perm('website','write'));

create policy services_read on services for select
  using (is_published or has_perm('website','read'));
create policy services_write on services for all to authenticated
  using (has_perm('website','write')) with check (has_perm('website','write'));

create policy capabilities_read on capabilities for select
  using (is_published or has_perm('website','read'));
create policy capabilities_write on capabilities for all to authenticated
  using (has_perm('website','write')) with check (has_perm('website','write'));

create policy case_studies_read on case_studies for select
  using (is_published or has_perm('website','read'));
create policy case_studies_write on case_studies for all to authenticated
  using (has_perm('website','write')) with check (has_perm('website','write'));

create policy testimonials_read on testimonials for select
  using (is_published or has_perm('website','read'));
create policy testimonials_write on testimonials for all to authenticated
  using (has_perm('website','write')) with check (has_perm('website','write'));

create policy blog_read on blog_posts for select
  using (approval_status = 'approved' or author_id = auth.uid() or has_perm('website','read'));
-- every staff member can blog: own posts; website.write manages all
create policy blog_insert on blog_posts for insert to authenticated
  with check (author_id = auth.uid());
create policy blog_update on blog_posts for update to authenticated
  using (author_id = auth.uid() or has_perm('website','write'));
create policy blog_delete on blog_posts for delete to authenticated
  using (author_id = auth.uid() or has_perm('website','write'));

-- Only website.write (super admin) can approve blog posts.
create or replace function enforce_blog_approval()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;     -- service role / seed
  if has_perm('website', 'write') then return new; end if;
  if tg_op = 'INSERT' then
    if new.approval_status in ('approved', 'rejected') then
      raise exception 'Only the super admin can approve posts';
    end if;
  else
    if new.approval_status is distinct from old.approval_status
       and new.approval_status in ('approved', 'rejected') then
      raise exception 'Only the super admin can approve posts';
    end if;
    -- an author editing an approved post sends it back to review
    if old.approval_status = 'approved' and new.approval_status = 'approved'
       and (new.title is distinct from old.title
            or new.body is distinct from old.body
            or new.excerpt is distinct from old.excerpt
            or new.cover_url is distinct from old.cover_url) then
      raise exception 'Edits to an approved post must go through review again';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_blog_approval on blog_posts;
create trigger trg_blog_approval before insert or update on blog_posts
  for each row execute function enforce_blog_approval();


create policy faqs_read on faqs for select
  using (is_published or has_perm('website','read'));
create policy faqs_write on faqs for all to authenticated
  using (has_perm('website','write')) with check (has_perm('website','write'));

create policy inquiries_insert on contact_inquiries for insert with check (true);
create policy inquiries_read on contact_inquiries for select to authenticated
  using (has_perm('clients','read') or has_perm('website','read'));
create policy inquiries_update on contact_inquiries for update to authenticated
  using (has_perm('clients','write') or has_perm('website','write'));
create policy inquiries_delete on contact_inquiries for delete to authenticated
  using (has_perm('clients','write'));

create policy job_posts_read on job_posts for select
  using (is_open or has_perm('recruitment','read'));
create policy job_posts_write on job_posts for all to authenticated
  using (has_perm('recruitment','write')) with check (has_perm('recruitment','write'));

create policy candidates_insert on candidates for insert with check (true);
create policy candidates_read on candidates for select to authenticated
  using (has_perm('recruitment','read'));
create policy candidates_update on candidates for update to authenticated
  using (has_perm('recruitment','write'));
create policy candidates_delete on candidates for delete to authenticated
  using (has_perm('recruitment','write'));

-- ---- clients ---------------------------------------------------
-- project owners/members may read the clients of their projects
create policy clients_read on clients for select to authenticated
  using (has_perm('clients','read')
         or exists (select 1 from projects p
                     where p.client_id = clients.id
                       and (p.owner_id = auth.uid() or is_project_member(p.id))));
create policy clients_write on clients for all to authenticated
  using (has_perm('clients','write')) with check (has_perm('clients','write'));

create policy client_contacts_read on client_contacts for select to authenticated
  using (has_perm('clients','read'));
create policy client_contacts_write on client_contacts for all to authenticated
  using (has_perm('clients','write')) with check (has_perm('clients','write'));

-- ---- projects --------------------------------------------------
create policy projects_select on projects for select to authenticated
  using (can_view_project(id));
create policy projects_insert on projects for insert to authenticated
  with check (has_perm('projects','write'));
create policy projects_update on projects for update to authenticated
  using (can_manage_project(id));
create policy projects_delete on projects for delete to authenticated
  using (has_perm('projects','write') and is_archived);

create policy members_select on project_members for select to authenticated
  using (user_id = auth.uid() or can_view_project(project_id));
create policy members_insert on project_members for insert to authenticated
  with check (can_manage_project(project_id));
create policy members_delete on project_members for delete to authenticated
  using (can_manage_project(project_id));

create policy milestones_select on project_milestones for select to authenticated
  using (can_view_project(project_id));
create policy milestones_write on project_milestones for insert to authenticated
  with check (can_manage_project(project_id));
create policy milestones_update on project_milestones for update to authenticated
  using (can_manage_project(project_id));
create policy milestones_delete on project_milestones for delete to authenticated
  using (can_manage_project(project_id));

create policy tasks_select on tasks for select to authenticated
  using (can_view_project(project_id));
create policy tasks_insert on tasks for insert to authenticated
  with check ((is_project_member(project_id) or can_manage_project(project_id))
              and created_by = auth.uid());
create policy tasks_update on tasks for update to authenticated
  using (is_project_member(project_id) or can_manage_project(project_id));
create policy tasks_delete on tasks for delete to authenticated
  using (can_manage_project(project_id) and is_archived);

create policy comments_select on task_comments for select to authenticated
  using (can_view_project(task_project(task_id)));
create policy comments_insert on task_comments for insert to authenticated
  with check (user_id = auth.uid() and can_view_project(task_project(task_id)));
create policy comments_delete on task_comments for delete to authenticated
  using (user_id = auth.uid() or can_manage_project(task_project(task_id)));

create policy attachments_select on task_attachments for select to authenticated
  using (can_view_project(task_project(task_id)));
create policy attachments_insert on task_attachments for insert to authenticated
  with check (uploaded_by = auth.uid()
              and (is_project_member(task_project(task_id))
                   or can_manage_project(task_project(task_id))));
create policy attachments_delete on task_attachments for delete to authenticated
  using (uploaded_by = auth.uid() or can_manage_project(task_project(task_id)));

-- ---- personal tasks (owner only - not even COO) ----------------
create policy personal_all on personal_tasks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy personal_occ_all on personal_task_occurrences for all to authenticated
  using (exists (select 1 from personal_tasks t
                  where t.id = task_id and t.user_id = auth.uid()))
  with check (exists (select 1 from personal_tasks t
                       where t.id = task_id and t.user_id = auth.uid()));

-- ---- attendance / leave ----------------------------------------
create policy attendance_select on attendance_logs for select to authenticated
  using (user_id = auth.uid() or has_perm('attendance','read'));
create policy attendance_insert on attendance_logs for insert to authenticated
  with check (user_id = auth.uid() or has_perm('attendance','write'));
create policy attendance_update on attendance_logs for update to authenticated
  using (user_id = auth.uid() or has_perm('attendance','write'));

create policy leave_select on leave_requests for select to authenticated
  using (user_id = auth.uid() or has_perm('attendance','read'));
create policy leave_insert on leave_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
create policy leave_update on leave_requests for update to authenticated
  using (has_perm('attendance','write'));
create policy leave_delete on leave_requests for delete to authenticated
  using ((user_id = auth.uid() and status = 'pending') or has_perm('attendance','write'));

-- ---- announcements / kb ----------------------------------------
create policy announcements_read on announcements for select to authenticated using (true);
create policy announcements_write on announcements for all to authenticated
  using (has_perm('announcements','write')) with check (has_perm('announcements','write'));

create policy kb_read on kb_articles for select to authenticated using (true);
create policy kb_write on kb_articles for all to authenticated
  using (has_perm('kb','write')) with check (has_perm('kb','write'));

-- ---- finance ----------------------------------------------------
create policy invoices_read on invoices for select to authenticated
  using (has_perm('finance','read'));
create policy invoices_write on invoices for all to authenticated
  using (has_perm('finance','write')) with check (has_perm('finance','write'));

create policy payments_read on payments for select to authenticated
  using (has_perm('finance','read'));
create policy payments_write on payments for all to authenticated
  using (has_perm('finance','write')) with check (has_perm('finance','write'));

create policy expenses_read on expenses for select to authenticated
  using (has_perm('finance','read'));
create policy expenses_write on expenses for all to authenticated
  using (has_perm('finance','write')) with check (has_perm('finance','write'));

-- ---- payroll (most sensitive: payroll perm or own rows) ----------
create policy salaries_read on staff_salaries for select to authenticated
  using (user_id = auth.uid() or has_perm('payroll','read'));
create policy salaries_write on staff_salaries for all to authenticated
  using (has_perm('payroll','write')) with check (has_perm('payroll','write'));

create policy salary_records_read on salary_records for select to authenticated
  using (user_id = auth.uid() or has_perm('payroll','read'));
create policy salary_records_write on salary_records for all to authenticated
  using (has_perm('payroll','write')) with check (has_perm('payroll','write'));

create policy salary_adj_read on salary_adjustments for select to authenticated
  using (has_perm('payroll','read')
         or exists (select 1 from salary_records r
                     where r.id = salary_record_id and r.user_id = auth.uid()));
create policy salary_adj_write on salary_adjustments for all to authenticated
  using (has_perm('payroll','write')) with check (has_perm('payroll','write'));

-- ---- notifications / activity ------------------------------------
create policy notifications_select on notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update on notifications for update to authenticated
  using (user_id = auth.uid());
create policy notifications_delete on notifications for delete to authenticated
  using (user_id = auth.uid());

create policy activity_select on activity_logs for select to authenticated
  using ((project_id is not null and can_view_project(project_id))
         or has_perm('reports','read'));

-- =============================================================
-- REALTIME
-- =============================================================
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table task_comments;
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table project_milestones;
alter publication supabase_realtime add table notifications;


-- =============================================================
-- SEED DATA (roles, permissions, website content)
-- No demo users - npm run seed creates the COO; staff
-- self-register at /register and get approved in /admin/staff.
-- =============================================================

-- ---------------- roles ---------------------------------------
insert into roles (name, display_name, is_system) values
  ('coo',     'COO - Super Admin',  true),
  ('ceo',     'CEO',                true),
  ('cto',     'CTO',                true),
  ('hr',      'HR Manager',         false),
  ('finance', 'Finance Manager',    false),
  ('pm',      'Project Manager',    false),
  ('staff',   'Staff',              true);

-- ---------------- permission catalog ---------------------------
insert into permissions (code, label) values
  ('website',            'Website CMS'),
  ('projects',           'Projects (all)'),
  ('projects.mark_paid', 'Mark projects/milestones Paid'),
  ('staff',              'Staff management'),
  ('attendance',         'Attendance & leave approval'),
  ('recruitment',        'Recruitment'),
  ('clients',            'Clients'),
  ('finance',            'Finance records'),
  ('payroll',            'Payroll'),
  ('reports',            'Reports & summaries'),
  ('kb',                 'Knowledge base management'),
  ('announcements',      'Announcements'),
  ('permissions',        'Roles & permissions');

-- ---------------- role defaults --------------------------------
insert into role_permissions (role_id, code, level)
select r.id, v.code, v.level::perm_level
from roles r
join (values
  ('ceo',     'reports',            'read'),
  ('ceo',     'projects',           'read'),
  ('ceo',     'staff',              'read'),
  ('ceo',     'clients',            'read'),
  ('ceo',     'finance',            'read'),
  ('cto',     'projects',           'write'),
  ('cto',     'projects.mark_paid', 'write'),
  ('cto',     'staff',              'read'),
  ('cto',     'reports',            'read'),
  ('cto',     'kb',                 'write'),
  ('hr',      'staff',              'write'),
  ('hr',      'attendance',         'write'),
  ('hr',      'recruitment',        'write'),
  ('hr',      'announcements',      'write'),
  ('hr',      'kb',                 'write'),
  ('hr',      'reports',            'read'),
  ('finance', 'finance',            'write'),
  ('finance', 'payroll',            'write'),
  ('finance', 'reports',            'read'),
  ('pm',      'projects',           'write'),
  ('pm',      'clients',            'read'),
  ('pm',      'reports',            'read')
) as v(role_name, code, level) on v.role_name = r.name;

-- ---------------- departments ----------------------------------
insert into departments (name) values
  ('Engineering'), ('Design'), ('Marketing'), ('HR'), ('Finance'), ('Management');

-- ---------------- site content ----------------------------------
insert into site_content (key, value) values
  ('site.name',    '{"text": "Sonex-Digital"}'),
  ('site.tagline', '{"text": "Build software that works. Ship faster. Scale smarter."}'),
  ('site.social',  '{"linkedin": "", "twitter": "", "github": "", "facebook": "", "instagram": "", "youtube": ""}'),
  ('home.hero',    '{"title": "Build Software That Works. Ship Faster. Scale Smarter.", "subtitle": "Sonex-Digital is your end-to-end technology partner - from first idea to deployment and beyond. Web platforms, mobile apps, ERP systems and AI that move real business numbers.", "cta": "Get a Free Consultation"}'),
  ('home.mission', '{"title": "Our mission", "body": "Most software projects fail on communication, not code. We exist to change that: small senior teams, transparent timelines, weekly demos, and working software you can click - not status reports you have to trust."}'),
  ('home.why',     '{"title": "Why teams choose Sonex-Digital", "points": ["Senior engineers on every project - nobody learns on your budget", "Working demos every week - you watch the product grow", "Transparent pricing, realistic timelines, no hidden charges", "Domain depth across fintech, healthcare, retail and logistics"]}'),
  ('home.capabilities', '{"heading": "We *Build* and *Transform* Products Using *AI-Powered* Technologies.", "card_title": "Fuel Your Digital-First Idea", "card_subtitle": "With 20+ Transformation Experts", "card_button": "Innovate With Us"}'),
  ('home.cta1',    '{"title": "Have a project in mind?", "body": "Tell us what you are building - a senior engineer replies with a concrete plan within one business day.", "button": "Get a Free Consultation"}'),
  ('home.cta2',    '{"title": "Not sure where to start?", "body": "Book a free 30-minute strategy call. You walk away with a roadmap, whether you hire us or not.", "button": "Book a Strategy Call"}'),
  ('home.cta3',    '{"title": "Let us build your next product together", "body": "From first sketch to first thousand users - we are the team that ships.", "button": "Partner With Us"}'),
  ('about.story',  '{"title": "Our story", "body": "Sonex-Digital started with a simple observation: most agencies sell hours, not outcomes. So we built the opposite - a studio where the people who scope your project are the people who build it, where every week ends with working software, and where launch day starts the relationship instead of ending it."}'),
  ('about.mission', '{"mission": "Ship ambitious ideas as dependable software.", "vision": "Become the technology partner growing companies trust with their core systems."}'),
  ('about.values', '{"values": [{"title": "Craftsmanship", "body": "We sweat the details others skip - tests, monitoring, documentation."}, {"title": "Transparency", "body": "Honest estimates, visible progress, no hidden charges."}, {"title": "Ownership", "body": "We treat your product like ours, long after launch day."}, {"title": "Speed", "body": "Weekly demos and short feedback loops - momentum is a feature."}]}'),
  ('about.stats',  '{"stats": [{"label": "Transformation experts", "value": "20+"}, {"label": "Solutions designed", "value": "500+"}, {"label": "Industries mastered", "value": "10+"}, {"label": "Client retention", "value": "94%"}]}'),
  ('about.leadership', '{"show_ceo": true, "show_cto": true}'),
  ('careers.why',  '{"title": "Why join us", "body": "Work with senior peers on products that actually ship. Sane deadlines, no on-call heroics, remote-first and async-friendly - with a real budget for your growth."}'),
  ('careers.benefits', '{"benefits": ["Remote-first, flexible hours", "Annual learning budget", "Top-spec hardware of your choice", "Private health insurance", "Paid conference trips", "Profit-share bonus"]}'),
  ('careers.process', '{"steps": ["Application review", "Intro call (30 min)", "Technical conversation about real work", "Team fit chat", "Offer"]}'),
  ('contact.info', '{"email": "hello@sonex-digital.com", "phone": "+1 (555) 010-2030", "address": "100 Harbor Ave, Suite 400, Seattle, WA"}'),
  ('services.process', '{"steps": [{"title": "Discover", "body": "A focused workshop maps your goals, constraints and success metrics - free, and yours to keep."}, {"title": "Design", "body": "UX flows, architecture and a milestone plan you approve before a line of code is written."}, {"title": "Build", "body": "Weekly working demos, CI/CD and tested code from the very first sprint."}, {"title": "Operate", "body": "Monitoring, support and iteration after launch - we stay accountable for the results."}]}'),
  ('legal.privacy', '{"title": "Privacy Policy", "updated": "2026-06-12", "body": "Sonex-Digital respects your privacy. This policy explains what we collect, why, and how we handle it.\n\n## What we collect\nWhen you use our contact form we collect your name, email, company and message. When you apply for a job we collect your name, email, phone, resume link and cover letter. Our staff portal stores account data for employees only.\n\n## How we use it\nContact inquiries are used solely to respond to your request. Job applications are used solely for recruitment. We do not sell, rent or share personal data with third parties for marketing.\n\n## Cookies\nThe public website sets no tracking cookies. The staff portal uses authentication cookies that are strictly necessary for login sessions.\n\n## Storage and security\nData is stored with our infrastructure provider (Supabase) in access-controlled databases. Access is limited to authorized staff under role-based permissions.\n\n## Retention\nInquiries and applications are kept as long as needed to handle them, then deleted on request or per internal schedules.\n\n## Your rights\nYou may request access to, correction of, or deletion of your personal data at any time using the contact details on our Contact page.\n\n## Changes\nWe may update this policy from time to time. The date above reflects the latest revision."}'),
  ('legal.terms',  '{"title": "Terms of Service", "updated": "2026-06-12", "body": "These terms govern your use of the Sonex-Digital website. By using the site you agree to them.\n\n## Use of the website\nThe site and its content are provided for general information about our services. You agree not to misuse the site, attempt unauthorized access, or disrupt its operation.\n\n## Intellectual property\nAll content on this site - text, graphics, logos and case studies - belongs to Sonex-Digital or its clients and may not be reproduced without permission.\n\n## Client engagements\nServices we provide to clients are governed by separate written agreements. Nothing on this site constitutes an offer or a binding commitment.\n\n## Submissions\nInformation you send through our forms must be accurate and lawful. You are responsible for the content of your submissions.\n\n## Disclaimer\nThe site is provided as is, without warranties of any kind. Case study results describe specific engagements and do not guarantee similar outcomes.\n\n## Limitation of liability\nTo the maximum extent permitted by law, Sonex-Digital is not liable for indirect or consequential damages arising from use of this website.\n\n## Changes\nWe may revise these terms at any time. Continued use of the site means you accept the current version."}');

-- ---------------- services --------------------------------------
insert into services (slug, title, summary, description, icon, offerings, tech_intro, technologies, sort_order) values
  ('web-development', 'Web Development', 'Conversion-focused websites and web platforms that load fast and never fall over.',
   'From marketing sites to enterprise platforms, we build secure, scalable web applications using modern frameworks and agile delivery. Seamless front-end and back-end integration, high performance and intuitive UI - every project is designed to be future-ready and aligned with your growth goals.',
   'globe',
   '{Custom Website Development,E-commerce Development,Responsive Web Design,CMS Development,Web Application Development,UI/UX Design}',
   'A versatile, battle-tested stack for responsive, secure and high-performance web applications:',
   '{React.js,Next.js,TypeScript,Node.js,PostgreSQL,Tailwind CSS,Vue.js,Firebase}', 1),

  ('mobile-apps', 'Mobile App Development', 'Native-quality iOS and Android apps from one senior team.',
   'Apps for products where mobile is the main act: offline-first sync, push notifications, payments and app store releases handled end to end. One codebase, two stores, zero compromise on feel.',
   'smartphone',
   '{iOS Development,Android Development,Cross-platform Apps,Offline-first Sync,Push and Payments,App Store Releases}',
   'One senior team for both stores - native quality from a shared codebase:',
   '{React Native,Expo,Swift,Kotlin,Flutter,Firebase,GraphQL}', 2),

  ('erp-development', 'ERP Development', 'Back-office systems tailored to how your company really works.',
   'Inventory, HR, finance and project operations in one coherent system - replacing spreadsheet sprawl with role-based, auditable workflows. We migrate your data, train your team and stay for the long run.',
   'building-2',
   '{Inventory and Operations,HR and Payroll Modules,Finance and Reporting,Role-based Access,Workflow Automation,Legacy Migration}',
   'Back-office systems live or die on data integrity and access control. Our ERP stack is built for both:',
   '{Next.js,TypeScript,PostgreSQL,Supabase,Redis,Docker}', 3),

  ('saas-development', 'SaaS Development', 'From prototype to production SaaS that scales with your customers.',
   'Multi-tenant architecture, subscription billing, onboarding and admin tooling - the unglamorous 80 percent of SaaS that decides whether it scales. We build it from day one so growth never means a rewrite.',
   'layers',
   '{Multi-tenant Architecture,Subscription Billing,Onboarding Flows,Admin Tooling,Usage Analytics,API Platforms}',
   'From prototype to production SaaS - tenancy, billing and everything that decides whether it scales:',
   '{Next.js,TypeScript,PostgreSQL,Stripe,Vercel,AWS,Redis}', 4),

  ('ai-automation', 'AI & Automation', 'LLM features and workflow automation with measurable ROI.',
   'Document processing, support copilots, internal agents and pipeline automation - grounded in company data with rigorous evaluation, not hype. We ship AI that earns its keep and prove it with numbers.',
   'bot',
   '{LLM Integration,RAG Pipelines,Support Copilots,Internal Agents,Document Processing,Workflow Automation}',
   'AI features grounded in company data with evaluation, not vibes. Our AI engineering stack:',
   '{Python,OpenAI,Anthropic,PostgreSQL,LangChain,Docker}', 5),

  ('cloud-devops', 'Cloud & DevOps', 'Infrastructure that deploys itself and pages no one.',
   'Cloud architecture, CI/CD, infrastructure as code, observability and cost control - production readiness as a service. Deployments take minutes, rollbacks take seconds, and your team sleeps at night.',
   'cloud',
   '{Cloud Architecture,CI/CD Pipelines,Infrastructure as Code,Observability,Cost Optimization,Security Hardening}',
   'Infrastructure that deploys itself and pages no one - production readiness as a service:',
   '{AWS,Vercel,Docker,Kubernetes,Terraform,GitHub,Grafana}', 6);

-- ---------------- capabilities -----------------------------------
insert into capabilities (title, description, icon, sort_order) values
  ('Artificial Intelligence', 'We leverage AI to craft intelligent solutions that streamline operations and sharpen decision-making across the business.', 'cpu', 1),
  ('Generative AI', 'We use generative AI to build solutions that produce new content, automate creative processes and elevate user experiences.', 'sparkles', 2),
  ('Machine Learning', 'We build ML systems that analyze data patterns and predict outcomes while continuously improving with every cycle.', 'brain-circuit', 3),
  ('AI Agent Integration', 'We integrate intelligent agents that automate tasks, respond to users, analyze data and act in real time without human intervention.', 'workflow', 4),
  ('Cloud Infrastructure', 'Scalable, secure cloud architecture that adds flexibility and cuts IT overhead, so teams focus on business growth.', 'cloud', 5),
  ('Data Science', 'We make raw business data clean, connected and queryable - dashboards and pipelines your decisions can stand on.', 'database', 6);

-- ---------------- case studies ------------------------------------
insert into case_studies (slug, title, client_name, category, summary, body, technologies, service_id, sort_order)
select v.slug, v.title, v.client_name, v.category, v.summary, v.body, v.techs::text[], s.id, v.sort_order
from (values
  ('logistics-erp', 'Logistics ERP replacing 40 spreadsheets', 'Meridian Freight', 'ERP',
   'A dispatch, billing and fleet system for a 200-truck logistics firm - invoice time cut from 3 days to 20 minutes.',
   'Meridian ran operations on interlinked spreadsheets that broke weekly. We delivered a role-based ERP covering dispatch, driver settlement and customer billing in six months of milestone releases. Result: invoicing went from 3 days to 20 minutes, and month-end close from 2 weeks to 2 days.',
   '{Next.js,PostgreSQL,Supabase,TypeScript}', 'erp-development', 1),
  ('fintech-saas', 'Multi-tenant invoicing SaaS, 0 to 12k users', 'LedgerKit', 'SaaS',
   'B2B invoicing platform launched in four months, scaled to 12,000 businesses on the same architecture.',
   'LedgerKit needed to go from Figma to paying customers in one funding runway. We built tenancy, Stripe billing, PDF pipelines and an admin console; the original architecture still serves 12k tenants without a rewrite.',
   '{Next.js,Stripe,PostgreSQL,Vercel}', 'saas-development', 2),
  ('field-app', 'Offline-first field service app', 'GreenGrid Energy', 'Mobile',
   'Inspection app for solar technicians working without coverage - syncing 50k reports a month.',
   'Technicians work on rooftops with no signal. We built an offline-first React Native app with conflict-free sync, photo evidence and dynamic checklists, now processing 50,000 inspection reports monthly.',
   '{React Native,Expo,Firebase,GraphQL}', 'mobile-apps', 3),
  ('support-copilot', 'AI support copilot deflecting 38% of tickets', 'Harbor Health', 'AI',
   'A retrieval-grounded assistant for a healthcare scheduling platform, deflecting 38% of tier-1 tickets.',
   'The Harbor support team drowned in scheduling questions. We shipped a RAG copilot grounded in their help center and policies, with evaluation gates before every release. Tier-1 deflection reached 38% in the first quarter.',
   '{Python,OpenAI,PostgreSQL,Docker}', 'ai-automation', 4)
) as v(slug, title, client_name, category, summary, body, techs, svc_slug, sort_order)
join services s on s.slug = v.svc_slug;

-- ---------------- testimonials -------------------------------------
insert into testimonials (author, company, quote, sort_order) values
  ('Sam Okafor', 'Founder, LedgerKit', 'Sonex-Digital built our MVP in nine weeks - on time, on budget, no hidden charges. Clear communication and quality output the whole way. We could not be happier.', 1),
  ('Dana Whitfield', 'COO, Meridian Freight', 'They replaced a decade of spreadsheet chaos in six months. The first vendor we have had that ships exactly what they promise, when they promise it.', 2),
  ('Elena Kovacs', 'VP Ops, GreenGrid Energy', 'Field adoption was instant - technicians actually thank us for the app. I have never seen that happen with internal software.', 3);

-- ---------------- faqs (home page) ----------------------------------
insert into faqs (question, answer, sort_order) values
  ('What does an engagement look like?', 'A free discovery call, then fixed milestones with weekly working demos. You always know what ships next and what it costs.', 1),
  ('How big is the team on my project?', 'Typically 2-4 senior engineers plus a designer. Small on purpose - communication overhead kills projects.', 2),
  ('How fast can you start?', 'Discovery within a week, first sprint usually within two. If timing is critical, say so - we plan capacity around committed dates.', 3),
  ('Are there hidden costs?', 'No. You approve a milestone plan with prices before we write code, and scope changes are priced before they happen - never after.', 4),
  ('Do you take over existing codebases?', 'Yes. We start with a paid technical audit, then propose a stabilization or rebuild plan with honest trade-offs.', 5),
  ('What happens after launch?', 'Monitoring, support and iteration. Launch day starts the relationship - most of our clients ship with us for years.', 6);

-- ---------------- job posts ------------------------------------------
insert into job_posts (title, department, location, employment_type, description, requirements, salary_range, is_open, sort_order) values
  ('Senior Full-Stack Engineer', 'Engineering', 'Remote', 'Full-time', 'Own features end-to-end across Next.js frontends and PostgreSQL backends for client products. Weekly demos, no on-call.', '5+ years building production web apps; strong TypeScript; comfort with SQL and system design; clear written communication.', '$120k-$160k', true, 1),
  ('Product Designer', 'Design', 'Remote', 'Full-time', 'Design flows, prototypes and design systems for B2B products, working directly with engineers and clients.', '4+ years in product design; strong Figma; experience designing complex dashboards or internal tools.', '$95k-$130k', true, 2),
  ('DevOps Engineer', 'Engineering', 'Remote', 'Contract', 'Build and maintain CI/CD, IaC and observability across client projects on AWS and Vercel.', 'Terraform or Pulumi; GitHub Actions; production AWS experience; security mindset.', '$90-$120/hr', true, 3);

-- ---------------- blog posts -------------------------------------------
insert into blog_posts (slug, title, excerpt, body, is_published, approval_status) values
  ('choosing-boring-technology', 'Why we choose boring technology', 'Innovation tokens are scarce. Spend them on your product, not your stack.', 'Every project gets a limited number of innovation tokens. Spend them on the thing that makes your product different - not on a novel database, a beta framework and an experimental deploy pipeline at the same time.' || E'\n\n' || 'When we scope a project, the stack question takes ten minutes: proven framework, proven database, proven hosting. All the creativity budget goes where it pays - your domain, your users, your edge.' || E'\n\n' || 'Boring technology is not slow technology. It is technology whose failure modes are documented, whose hires are easy, and whose upgrades do not eat quarters.', true, 'approved'),
  ('erp-mvp-scope', 'Scoping an ERP that actually ships', 'The fastest way to fail an ERP project is to build all of it at once.', 'ERP projects fail by scope, not by code. The systems that succeed start with the workflow that hurts most - usually projects or invoicing - and expand module by module on a live system with real users.' || E'\n\n' || 'Our rule: the first release must replace one painful spreadsheet within eight weeks. Real users on real data expose more truth in a week than requirement workshops do in a month.' || E'\n\n' || 'From there, each module earns its place. HR when hiring picks up. Payroll when headcount justifies it. Reports when there is data worth reporting on.', true, 'approved'),
  ('realtime-when-it-matters', 'Realtime where it matters, requests everywhere else', 'Not every screen needs a websocket. Most need a fast query.', 'Realtime is a feature, not an architecture. We subscribe to the few surfaces where live updates change behavior - boards, comments, notifications - and use plain queries for everything else.' || E'\n\n' || 'The payoff is real: costs drop, bugs drop, and nobody notices, which is the point. Users experience speed, not the plumbing behind it.' || E'\n\n' || 'If you are debating realtime for a screen, ask one question: will a user act differently within five seconds of this data changing? If not, a fast query wins.', true, 'approved');

-- ---------------- storage buckets ---------------------------------------
insert into storage.buckets (id, name, public) values
  ('files', 'files', false),
  ('media', 'media', true)
on conflict (id) do nothing;

-- =============================================================
-- NOTIFICATION FANOUT
-- =============================================================

-- All active users holding a permission at the needed level,
-- mirroring has_perm(): COO always; user override wins; else role.
create or replace function users_with_perm(p_code text, p_need perm_level)
returns setof uuid language sql stable security definer set search_path = public as $$
  select p.id
    from profiles p
    join roles r on r.id = p.role_id
   where p.is_active
     and (
       r.name = 'coo'
       or coalesce(
            (select perm_rank(up.level) >= perm_rank(p_need)
               from user_permissions up
              where up.user_id = p.id and up.code = p_code),
            exists (select 1 from role_permissions rp
                     where rp.role_id = p.role_id and rp.code = p_code
                       and perm_rank(rp.level) >= perm_rank(p_need))
          )
     )
$$;
revoke all on function users_with_perm from public;
revoke all on function users_with_perm from anon;

-- Announcements -> a notification for every active staff member.
-- Gated: only announcement managers may call it.
create or replace function notify_all_staff(p_type text, p_title text, p_body text, p_link text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not has_perm('announcements', 'write') then
    raise exception 'Not allowed';
  end if;
  insert into notifications (user_id, type, title, body, link)
  select id, p_type, p_title, coalesce(p_body, ''), p_link
    from profiles where is_active;
end $$;
revoke all on function notify_all_staff from public;
grant execute on function notify_all_staff to authenticated;
revoke execute on function notify_all_staff from anon;

-- Project reaches Done -> notify everyone in charge of payment
-- collection (= holders of projects.mark_paid write; per-user
-- revokes excluded). Trigger-based so it also fires when the task
-- rollup moves the status.
create or replace function notify_payment_ready_project()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'done' and old.status is distinct from new.status then
    insert into notifications (user_id, type, title, body, link)
    select u, 'payment_ready', 'Project Done - request payment',
           'Project "' || new.name || '" is Done. Time to ask the client for payment.',
           '/admin/projects/' || new.id
      from users_with_perm('projects.mark_paid', 'write') u;
  end if;
  return new;
end $$;
drop trigger if exists trg_project_payment_ready on projects;
create trigger trg_project_payment_ready after update on projects
  for each row execute function notify_payment_ready_project();

-- Milestone reaches Done -> same payment heads-up.
create or replace function notify_payment_ready_milestone()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_project_name text;
begin
  if new.status = 'done' and old.status is distinct from new.status then
    select name into v_project_name from projects where id = new.project_id;
    insert into notifications (user_id, type, title, body, link)
    select u, 'payment_ready', 'Milestone Done - request payment',
           'Milestone "' || new.title || '" of "' || coalesce(v_project_name, 'project') ||
           '" is Done. Time to ask the client for payment.',
           '/admin/projects/' || new.project_id
      from users_with_perm('projects.mark_paid', 'write') u;
  end if;
  return new;
end $$;
drop trigger if exists trg_milestone_payment_ready on project_milestones;
create trigger trg_milestone_payment_ready after update on project_milestones
  for each row execute function notify_payment_ready_milestone();
