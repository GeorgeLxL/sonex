-- =============================================================
-- MIGRATE CURRENT DB - run ONCE in the SQL editor, then delete.
-- Catch-up for a database created from an earlier setup.sql.
-- Idempotent: safe to run even if parts were already applied.
-- (Fresh installs use setup.sql instead and do NOT need this.)
-- =============================================================

-- ---------------- 1. per-user work schedules --------------------
alter table profiles add column if not exists work_start time not null default '09:00';
alter table profiles add column if not exists work_end   time not null default '18:00';

-- ---------------- 2. early-leave requests -----------------------
alter table leave_requests drop constraint if exists leave_requests_type_check;
alter table leave_requests add constraint leave_requests_type_check
  check (type in ('vacation', 'sick', 'personal', 'unpaid', 'early_leave'));
alter table leave_requests add column if not exists early_time time;

-- ---------------- 3. profile guard (staff may set own schedule) -
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

-- ---------------- 4. deletable staff (author FKs -> set null) ---
alter table projects           drop constraint if exists projects_created_by_fkey;
alter table projects           add constraint projects_created_by_fkey           foreign key (created_by)   references profiles(id) on delete set null;
alter table project_members    drop constraint if exists project_members_added_by_fkey;
alter table project_members    add constraint project_members_added_by_fkey      foreign key (added_by)     references profiles(id) on delete set null;
alter table tasks              drop constraint if exists tasks_created_by_fkey;
alter table tasks              add constraint tasks_created_by_fkey              foreign key (created_by)   references profiles(id) on delete set null;
alter table task_attachments   drop constraint if exists task_attachments_uploaded_by_fkey;
alter table task_attachments   add constraint task_attachments_uploaded_by_fkey  foreign key (uploaded_by)  references profiles(id) on delete set null;
alter table leave_requests     drop constraint if exists leave_requests_reviewed_by_fkey;
alter table leave_requests     add constraint leave_requests_reviewed_by_fkey    foreign key (reviewed_by)  references profiles(id) on delete set null;
alter table announcements      drop constraint if exists announcements_created_by_fkey;
alter table announcements      add constraint announcements_created_by_fkey      foreign key (created_by)   references profiles(id) on delete set null;
alter table kb_articles        drop constraint if exists kb_articles_created_by_fkey;
alter table kb_articles        add constraint kb_articles_created_by_fkey        foreign key (created_by)   references profiles(id) on delete set null;
alter table kb_articles        drop constraint if exists kb_articles_updated_by_fkey;
alter table kb_articles        add constraint kb_articles_updated_by_fkey        foreign key (updated_by)   references profiles(id) on delete set null;
alter table expenses           drop constraint if exists expenses_created_by_fkey;
alter table expenses           add constraint expenses_created_by_fkey           foreign key (created_by)   references profiles(id) on delete set null;
alter table staff_salaries     drop constraint if exists staff_salaries_created_by_fkey;
alter table staff_salaries     add constraint staff_salaries_created_by_fkey     foreign key (created_by)   references profiles(id) on delete set null;
alter table salary_records     drop constraint if exists salary_records_confirmed_by_fkey;
alter table salary_records     add constraint salary_records_confirmed_by_fkey   foreign key (confirmed_by) references profiles(id) on delete set null;
alter table salary_adjustments drop constraint if exists salary_adjustments_added_by_fkey;
alter table salary_adjustments add constraint salary_adjustments_added_by_fkey   foreign key (added_by)     references profiles(id) on delete set null;

-- ---------------- 5. inquiry form: phone, no budget -------------
alter table contact_inquiries add column if not exists phone text;
alter table contact_inquiries drop column if exists budget;

-- ---------------- 6. notification fanout ------------------------
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
