do $$
begin
  if not exists (select 1 from pg_type where typname = 'community_join_policy') then
    create type community_join_policy as enum ('instant', 'approval_required');
  end if;

  if not exists (select 1 from pg_type where typname = 'membership_status') then
    create type membership_status as enum ('pending', 'active', 'rejected', 'removed', 'banned');
  end if;

  if not exists (select 1 from pg_type where typname = 'result_report_status') then
    create type result_report_status as enum ('pending', 'disputed', 'confirmed', 'canceled');
  end if;

  if not exists (select 1 from pg_type where typname = 'feedback_type') then
    create type feedback_type as enum ('bug', 'complaint', 'feature_request', 'confusing_behavior', 'general');
  end if;
end $$;

create table if not exists app_admins (
  user_id uuid primary key references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table communities
  add column if not exists join_policy community_join_policy not null default 'instant',
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references profiles(id) on delete set null;

alter table community_memberships
  add column if not exists status membership_status not null default 'active',
  add column if not exists reviewed_by uuid references profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists status_reason text;

alter table results
  add column if not exists winner_score integer,
  add column if not exists loser_score integer,
  add column if not exists game_to integer,
  add column if not exists margin_multiplier numeric(6, 3),
  add column if not exists repeat_match_multiplier numeric(6, 3) not null default 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'results_score_shape'
  ) then
    alter table results
      add constraint results_score_shape check (
    (winner_score is null and loser_score is null and game_to is null)
    or (
      game_to in (7, 11, 21)
      and winner_score = game_to
      and loser_score >= 0
      and loser_score < winner_score
    )
  );
  end if;
end $$;

create table if not exists result_reports (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null unique references challenges(id) on delete cascade,
  community_id uuid not null references communities(id) on delete cascade,
  submitted_by uuid not null references profiles(id) on delete cascade,
  winner_id uuid not null references profiles(id) on delete cascade,
  loser_id uuid not null references profiles(id) on delete cascade,
  winner_score integer not null,
  loser_score integer not null,
  game_to integer not null,
  status result_report_status not null default 'pending',
  confirmed_by uuid references profiles(id) on delete set null,
  confirmed_at timestamptz,
  disputed_by uuid references profiles(id) on delete set null,
  disputed_at timestamptz,
  dispute_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint result_report_no_self_result check (winner_id <> loser_id),
  constraint result_report_valid_score check (
    game_to in (7, 11, 21)
    and winner_score = game_to
    and loser_score >= 0
    and loser_score < winner_score
  )
);

create table if not exists feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  community_id uuid references communities(id) on delete set null,
  type feedback_type not null default 'general',
  screen text,
  message text not null,
  screenshot_url text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists communities_archived_at_idx on communities(archived_at);
create index if not exists community_memberships_active_idx
  on community_memberships(community_id, status, role, user_id);
create index if not exists challenges_active_pair_idx
  on challenges (community_id, least(challenger_id, challenged_id), greatest(challenger_id, challenged_id), status);
create index if not exists result_reports_challenge_status_idx on result_reports(challenge_id, status);
create index if not exists result_reports_community_status_idx on result_reports(community_id, status, created_at desc);
create index if not exists results_head_to_head_idx
  on results (community_id, least(winner_id, loser_id), greatest(winner_id, loser_id), created_at desc);
create index if not exists feedback_submissions_user_created_idx on feedback_submissions(user_id, created_at desc);

drop index if exists one_active_challenge_pair_idx;
create unique index if not exists one_active_challenge_pair_idx
  on challenges (community_id, least(challenger_id, challenged_id), greatest(challenger_id, challenged_id))
  where status in ('pending', 'accepted', 'result_pending', 'disputed');

drop trigger if exists touch_result_reports_updated_at on result_reports;
create trigger touch_result_reports_updated_at
before update on result_reports
for each row execute function touch_updated_at();

create or replace function is_app_admin(target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from app_admins
    where user_id = target_user_id
  );
$$;

create or replace function is_community_member(target_community_id uuid, target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from community_memberships
    where community_id = target_community_id
      and user_id = target_user_id
      and status = 'active'
  );
$$;

create or replace function is_community_admin(target_community_id uuid, target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select is_app_admin(target_user_id)
    or exists (
      select 1 from community_memberships
      where community_id = target_community_id
        and user_id = target_user_id
        and role = 'admin'
        and status = 'active'
    );
$$;

create or replace function create_stats_for_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' then
    insert into community_player_stats (community_id, user_id)
    values (new.community_id, new.user_id)
    on conflict (community_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists create_stats_after_membership on community_memberships;
create trigger create_stats_after_membership
after insert or update of status on community_memberships
for each row execute function create_stats_for_membership();

create or replace function validate_challenge_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from communities where id = new.community_id and archived_at is not null) then
    raise exception 'archived communities do not accept new challenges';
  end if;

  if not is_community_member(new.community_id, new.challenger_id) then
    raise exception 'challenger is not an active member of this community';
  end if;

  if not is_community_member(new.community_id, new.challenged_id) then
    raise exception 'challenged player is not an active member of this community';
  end if;

  return new;
end;
$$;

drop function if exists join_community(uuid);
create or replace function join_community(target_community_id uuid)
returns community_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  community_row communities;
  current_profile profiles;
  existing_membership community_memberships;
  next_status membership_status;
  saved_membership community_memberships;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into community_row from communities where id = target_community_id;
  if not found then
    raise exception 'community not found';
  end if;

  if community_row.archived_at is not null then
    raise exception 'archived communities cannot be joined';
  end if;

  select * into current_profile from profiles where id = auth.uid();
  if not found then
    raise exception 'profile not found';
  end if;

  if community_row.visibility = 'domain_restricted'
    and not is_app_admin(auth.uid())
    and not email_matches_domain(auth.uid(), community_row.allowed_email_domain) then
    raise exception 'email domain is not allowed for this community';
  end if;

  select * into existing_membership
  from community_memberships
  where community_id = target_community_id and user_id = auth.uid()
  for update;

  if found and existing_membership.status = 'banned' then
    raise exception 'you are banned from this community';
  end if;

  if found and existing_membership.status in ('active', 'pending') then
    return existing_membership;
  end if;

  next_status := case
    when is_app_admin(auth.uid()) then 'active'::membership_status
    when community_row.join_policy = 'approval_required' then 'pending'::membership_status
    else 'active'::membership_status
  end;

  if found then
    update community_memberships
    set
      status = next_status,
      role = 'member',
      reviewed_by = null,
      reviewed_at = null,
      status_reason = null
    where id = existing_membership.id
    returning * into saved_membership;
  else
    insert into community_memberships (community_id, user_id, role, status)
    values (target_community_id, auth.uid(), 'member', next_status)
    returning * into saved_membership;
  end if;

  return saved_membership;
end;
$$;

create or replace function review_community_membership(
  target_membership_id uuid,
  next_status membership_status,
  reason text default null
)
returns community_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  membership_row community_memberships;
  active_admin_count integer;
  updated_membership community_memberships;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into membership_row
  from community_memberships
  where id = target_membership_id
  for update;

  if not found then
    raise exception 'membership not found';
  end if;

  if not is_community_admin(membership_row.community_id, auth.uid()) then
    raise exception 'community admin required';
  end if;

  if next_status not in ('active', 'rejected', 'removed', 'banned') then
    raise exception 'unsupported membership status';
  end if;

  if membership_row.role = 'admin'
    and membership_row.status = 'active'
    and next_status <> 'active'
    and not is_app_admin(auth.uid()) then
    select count(*) into active_admin_count
    from community_memberships
    where community_id = membership_row.community_id
      and role = 'admin'
      and status = 'active';

    if active_admin_count <= 1 then
      raise exception 'cannot remove the last active community admin';
    end if;
  end if;

  update community_memberships
  set
    status = next_status,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    status_reason = nullif(reason, '')
  where id = membership_row.id
  returning * into updated_membership;

  return updated_membership;
end;
$$;

create or replace function set_community_membership_role(
  target_membership_id uuid,
  next_role membership_role
)
returns community_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  membership_row community_memberships;
  community_row communities;
  active_admin_count integer;
  updated_membership community_memberships;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into membership_row
  from community_memberships
  where id = target_membership_id
  for update;

  if not found then
    raise exception 'membership not found';
  end if;

  select * into community_row from communities where id = membership_row.community_id;

  if not (is_app_admin(auth.uid()) or community_row.created_by = auth.uid()) then
    raise exception 'only the community creator or an app admin can assign admins';
  end if;

  if membership_row.status <> 'active' then
    raise exception 'only active members can become admins';
  end if;

  if membership_row.role = 'admin' and next_role = 'member' and not is_app_admin(auth.uid()) then
    select count(*) into active_admin_count
    from community_memberships
    where community_id = membership_row.community_id
      and role = 'admin'
      and status = 'active';

    if active_admin_count <= 1 then
      raise exception 'cannot demote the last active community admin';
    end if;
  end if;

  update community_memberships
  set role = next_role
  where id = membership_row.id
  returning * into updated_membership;

  return updated_membership;
end;
$$;

create or replace function archive_community(target_community_id uuid)
returns communities
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_community communities;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not is_community_admin(target_community_id, auth.uid()) then
    raise exception 'community admin required';
  end if;

  update communities
  set archived_at = coalesce(archived_at, now()),
      archived_by = coalesce(archived_by, auth.uid())
  where id = target_community_id
  returning * into updated_community;

  if updated_community.id is null then
    raise exception 'community not found';
  end if;

  return updated_community;
end;
$$;

create or replace function unarchive_community(target_community_id uuid)
returns communities
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_community communities;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not is_app_admin(auth.uid()) then
    raise exception 'app admin required';
  end if;

  update communities
  set archived_at = null,
      archived_by = null
  where id = target_community_id
  returning * into updated_community;

  if updated_community.id is null then
    raise exception 'community not found';
  end if;

  return updated_community;
end;
$$;

create or replace function calculate_margin_multiplier(
  winner_score_input integer,
  loser_score_input integer,
  game_to_input integer
)
returns numeric
language sql
immutable
as $$
  select least(
    2.0,
    greatest(0.75, 0.5 + 1.5 * ((winner_score_input - loser_score_input)::numeric / game_to_input))
  );
$$;

create or replace function calculate_repeat_match_multiplier(
  target_community_id uuid,
  player_a uuid,
  player_b uuid,
  target_time timestamptz default now()
)
returns numeric
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  recent_count integer;
begin
  select count(*) into recent_count
  from results
  where community_id = target_community_id
    and created_at >= target_time - interval '7 days'
    and least(winner_id, loser_id) = least(player_a, player_b)
    and greatest(winner_id, loser_id) = greatest(player_a, player_b);

  if recent_count < 3 then
    return 1;
  elsif recent_count < 5 then
    return 0.5;
  end if;

  return 0;
end;
$$;

create or replace function submit_result_report(
  target_challenge_id uuid,
  winner_profile_id uuid,
  winner_score_input integer,
  loser_score_input integer,
  game_to_input integer
)
returns result_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  challenge_row challenges;
  loser_profile_id uuid;
  inserted_report result_reports;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into challenge_row
  from challenges
  where id = target_challenge_id
  for update;

  if not found then
    raise exception 'challenge not found';
  end if;

  if exists (select 1 from communities where id = challenge_row.community_id and archived_at is not null) then
    raise exception 'results cannot be submitted for archived communities';
  end if;

  if challenge_row.status <> 'accepted' then
    raise exception 'results can only be submitted for accepted challenges';
  end if;

  if auth.uid() not in (challenge_row.challenger_id, challenge_row.challenged_id) then
    raise exception 'only involved players can submit a result';
  end if;

  if winner_profile_id not in (challenge_row.challenger_id, challenge_row.challenged_id) then
    raise exception 'winner must be one of the challenge players';
  end if;

  if game_to_input not in (7, 11, 21)
    or winner_score_input <> game_to_input
    or loser_score_input < 0
    or loser_score_input >= winner_score_input then
    raise exception 'score must be a standard game to 7, 11, or 21';
  end if;

  loser_profile_id := case
    when winner_profile_id = challenge_row.challenger_id then challenge_row.challenged_id
    else challenge_row.challenger_id
  end;

  insert into result_reports (
    challenge_id,
    community_id,
    submitted_by,
    winner_id,
    loser_id,
    winner_score,
    loser_score,
    game_to
  )
  values (
    challenge_row.id,
    challenge_row.community_id,
    auth.uid(),
    winner_profile_id,
    loser_profile_id,
    winner_score_input,
    loser_score_input,
    game_to_input
  )
  returning * into inserted_report;

  update challenges
  set status = 'result_pending'
  where id = challenge_row.id;

  return inserted_report;
end;
$$;

create or replace function confirm_result_report(target_report_id uuid)
returns results
language plpgsql
security definer
set search_path = public
as $$
declare
  report_row result_reports;
  challenge_row challenges;
  winner_stats community_player_stats;
  loser_stats community_player_stats;
  expected_winner numeric;
  expected_loser numeric;
  margin_factor numeric;
  repeat_factor numeric;
  winner_new_rating integer;
  loser_new_rating integer;
  inserted_result results;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into report_row
  from result_reports
  where id = target_report_id
  for update;

  if not found then
    raise exception 'result report not found';
  end if;

  if report_row.status <> 'pending' then
    raise exception 'only pending result reports can be confirmed';
  end if;

  select * into challenge_row
  from challenges
  where id = report_row.challenge_id
  for update;

  if auth.uid() not in (challenge_row.challenger_id, challenge_row.challenged_id) then
    raise exception 'only involved players can confirm a result';
  end if;

  if auth.uid() = report_row.submitted_by then
    raise exception 'the other player must confirm this result';
  end if;

  select * into winner_stats
  from community_player_stats
  where community_id = report_row.community_id and user_id = report_row.winner_id
  for update;

  select * into loser_stats
  from community_player_stats
  where community_id = report_row.community_id and user_id = report_row.loser_id
  for update;

  if winner_stats.id is null or loser_stats.id is null then
    raise exception 'missing community player stats';
  end if;

  expected_winner := 1 / (1 + power(10, (loser_stats.elo_rating - winner_stats.elo_rating)::numeric / 400));
  expected_loser := 1 / (1 + power(10, (winner_stats.elo_rating - loser_stats.elo_rating)::numeric / 400));
  margin_factor := calculate_margin_multiplier(report_row.winner_score, report_row.loser_score, report_row.game_to);
  repeat_factor := calculate_repeat_match_multiplier(
    report_row.community_id,
    report_row.winner_id,
    report_row.loser_id,
    now()
  );
  winner_new_rating := round(winner_stats.elo_rating + 32 * margin_factor * repeat_factor * (1 - expected_winner));
  loser_new_rating := round(loser_stats.elo_rating + 32 * margin_factor * repeat_factor * (0 - expected_loser));

  insert into results (
    challenge_id,
    community_id,
    winner_id,
    loser_id,
    submitted_by,
    winner_elo_before,
    loser_elo_before,
    winner_elo_after,
    loser_elo_after,
    winner_score,
    loser_score,
    game_to,
    margin_multiplier,
    repeat_match_multiplier
  )
  values (
    report_row.challenge_id,
    report_row.community_id,
    report_row.winner_id,
    report_row.loser_id,
    report_row.submitted_by,
    winner_stats.elo_rating,
    loser_stats.elo_rating,
    winner_new_rating,
    loser_new_rating,
    report_row.winner_score,
    report_row.loser_score,
    report_row.game_to,
    margin_factor,
    repeat_factor
  )
  returning * into inserted_result;

  update community_player_stats
  set
    elo_rating = winner_new_rating,
    games_played = games_played + 1,
    wins = wins + 1
  where id = winner_stats.id;

  update community_player_stats
  set
    elo_rating = loser_new_rating,
    games_played = games_played + 1,
    losses = losses + 1
  where id = loser_stats.id;

  update result_reports
  set
    status = 'confirmed',
    confirmed_by = auth.uid(),
    confirmed_at = now()
  where id = report_row.id;

  update challenges
  set status = 'completed', completed_at = now()
  where id = challenge_row.id;

  return inserted_result;
end;
$$;

create or replace function dispute_result_report(target_report_id uuid, reason text default null)
returns result_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  report_row result_reports;
  challenge_row challenges;
  updated_report result_reports;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into report_row
  from result_reports
  where id = target_report_id
  for update;

  if not found then
    raise exception 'result report not found';
  end if;

  if report_row.status <> 'pending' then
    raise exception 'only pending result reports can be disputed';
  end if;

  select * into challenge_row
  from challenges
  where id = report_row.challenge_id
  for update;

  if auth.uid() not in (challenge_row.challenger_id, challenge_row.challenged_id) then
    raise exception 'only involved players can dispute a result';
  end if;

  update result_reports
  set
    status = 'disputed',
    disputed_by = auth.uid(),
    disputed_at = now(),
    dispute_reason = nullif(reason, '')
  where id = report_row.id
  returning * into updated_report;

  update challenges
  set status = 'disputed'
  where id = challenge_row.id;

  return updated_report;
end;
$$;

create or replace function submit_result(target_challenge_id uuid, winner_profile_id uuid)
returns results
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'submit_result is deprecated; use submit_result_report and confirm_result_report';
end;
$$;

alter table app_admins enable row level security;
alter table result_reports enable row level security;
alter table feedback_submissions enable row level security;

drop policy if exists "app admins can read app admins" on app_admins;
create policy "app admins can read app admins"
  on app_admins for select
  to authenticated
  using (is_app_admin(auth.uid()));

drop policy if exists "app admins can manage app admins" on app_admins;
create policy "app admins can manage app admins"
  on app_admins for all
  to authenticated
  using (is_app_admin(auth.uid()))
  with check (is_app_admin(auth.uid()));

drop policy if exists "members can read memberships in their communities" on community_memberships;
create policy "members can read memberships in their communities"
  on community_memberships for select
  to authenticated
  using (
    user_id = auth.uid()
    or is_community_member(community_id, auth.uid())
    or is_community_admin(community_id, auth.uid())
  );

drop policy if exists "users can join allowed communities as themselves" on community_memberships;
create policy "users can join allowed communities as themselves"
  on community_memberships for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and role = 'member'
    and status in ('pending', 'active')
    and exists (
      select 1 from communities c
      where c.id = community_id
        and c.archived_at is null
        and (
          c.visibility = 'public'
          or email_matches_domain(auth.uid(), c.allowed_email_domain)
          or c.created_by = auth.uid()
          or is_app_admin(auth.uid())
        )
    )
  );

drop policy if exists "community creators can add their own admin membership" on community_memberships;
create policy "community creators can add their own admin membership"
  on community_memberships for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and role = 'admin'
    and status = 'active'
    and exists (
      select 1 from communities c
      where c.id = community_id and c.created_by = auth.uid()
    )
  );

drop policy if exists "admins can add members" on community_memberships;
create policy "admins can add members"
  on community_memberships for insert
  to authenticated
  with check (is_community_admin(community_id, auth.uid()));

drop policy if exists "admins can update memberships" on community_memberships;
create policy "admins can update memberships"
  on community_memberships for update
  to authenticated
  using (is_community_admin(community_id, auth.uid()))
  with check (is_community_admin(community_id, auth.uid()));

drop policy if exists "members can read stats in their communities" on community_player_stats;
create policy "members can read stats in their communities"
  on community_player_stats for select
  to authenticated
  using (is_community_member(community_id, auth.uid()) or is_community_admin(community_id, auth.uid()));

drop policy if exists "users can read involved community challenges" on challenges;
create policy "users can read involved community challenges"
  on challenges for select
  to authenticated
  using (
    (is_community_member(community_id, auth.uid()) and (challenger_id = auth.uid() or challenged_id = auth.uid()))
    or is_community_admin(community_id, auth.uid())
  );

drop policy if exists "users can create challenges as themselves" on challenges;
create policy "users can create challenges as themselves"
  on challenges for insert
  to authenticated
  with check (
    challenger_id = auth.uid()
    and challenged_id <> auth.uid()
    and status = 'pending'
    and is_community_member(community_id, challenger_id)
    and is_community_member(community_id, challenged_id)
    and exists (select 1 from communities where id = community_id and archived_at is null)
  );

drop policy if exists "challenged players can accept or decline pending challenges" on challenges;
create policy "challenged players can accept or decline pending challenges"
  on challenges for update
  to authenticated
  using (challenged_id = auth.uid() and status = 'pending')
  with check (challenged_id = auth.uid() and status in ('accepted', 'declined'));

drop policy if exists "challengers can cancel pending challenges" on challenges;
create policy "challengers can cancel pending challenges"
  on challenges for update
  to authenticated
  using (challenger_id = auth.uid() and status = 'pending')
  with check (challenger_id = auth.uid() and status = 'canceled');

drop policy if exists "members can read community results" on results;
create policy "members can read community results"
  on results for select
  to authenticated
  using (is_community_member(community_id, auth.uid()) or is_community_admin(community_id, auth.uid()));

drop policy if exists "members can read community result reports" on result_reports;
create policy "members can read community result reports"
  on result_reports for select
  to authenticated
  using (
    (is_community_member(community_id, auth.uid()) and auth.uid() in (submitted_by, winner_id, loser_id))
    or is_community_admin(community_id, auth.uid())
  );

drop policy if exists "users can insert their own feedback" on feedback_submissions;
create policy "users can insert their own feedback"
  on feedback_submissions for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "users can read their own feedback" on feedback_submissions;
create policy "users can read their own feedback"
  on feedback_submissions for select
  to authenticated
  using (user_id = auth.uid() or is_app_admin(auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'feedback-screenshots',
  'feedback-screenshots',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users can upload their own feedback screenshots" on storage.objects;
create policy "users can upload their own feedback screenshots"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'feedback-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users can read their own feedback screenshots" on storage.objects;
create policy "users can read their own feedback screenshots"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'feedback-screenshots'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or is_app_admin(auth.uid())
    )
  );
