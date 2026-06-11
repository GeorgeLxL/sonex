-- Run once in the SQL editor (your DB predates these), then delete this file.

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
