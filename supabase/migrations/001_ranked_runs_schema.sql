create extension if not exists pgcrypto;

create type community_type as enum ('university', 'park', 'shul', 'gym', 'friend_group', 'other');
create type community_visibility as enum ('public', 'domain_restricted');
create type membership_role as enum ('member', 'admin');
create type challenge_status as enum ('pending', 'accepted', 'declined', 'completed', 'canceled');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  avatar_url text,
  last_selected_community_id uuid,
  created_at timestamptz not null default now()
);

create table communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type community_type not null default 'other',
  description text,
  location text,
  allowed_email_domain text,
  visibility community_visibility not null default 'public',
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint domain_required_for_restricted check (
    visibility = 'public' or allowed_email_domain is not null
  )
);

alter table profiles
  add constraint profiles_last_selected_community_id_fkey
  foreign key (last_selected_community_id) references communities(id) on delete set null;

create table community_memberships (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role membership_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique (community_id, user_id)
);

create table community_player_stats (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  elo_rating integer not null default 1200,
  games_played integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (community_id, user_id),
  constraint stats_non_negative check (
    elo_rating > 0 and games_played >= 0 and wins >= 0 and losses >= 0
  )
);

create table challenges (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  challenger_id uuid not null references profiles(id) on delete cascade,
  challenged_id uuid not null references profiles(id) on delete cascade,
  status challenge_status not null default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  constraint no_self_challenge check (challenger_id <> challenged_id)
);

create table results (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null unique references challenges(id) on delete cascade,
  community_id uuid not null references communities(id) on delete cascade,
  winner_id uuid not null references profiles(id) on delete cascade,
  loser_id uuid not null references profiles(id) on delete cascade,
  submitted_by uuid not null references profiles(id) on delete cascade,
  winner_elo_before integer not null,
  loser_elo_before integer not null,
  winner_elo_after integer not null,
  loser_elo_after integer not null,
  created_at timestamptz not null default now(),
  constraint no_self_result check (winner_id <> loser_id)
);

create index community_memberships_user_id_idx on community_memberships(user_id);
create index community_memberships_community_id_idx on community_memberships(community_id);
create index community_player_stats_community_elo_idx on community_player_stats(community_id, elo_rating desc);
create index challenges_community_id_idx on challenges(community_id);
create index challenges_challenger_id_idx on challenges(challenger_id);
create index challenges_challenged_id_idx on challenges(challenged_id);
create index challenges_status_idx on challenges(status);
create index results_community_id_idx on results(community_id);
create index results_winner_id_idx on results(winner_id);
create index results_loser_id_idx on results(loser_id);

create unique index one_active_challenge_pair_idx
  on challenges (community_id, least(challenger_id, challenged_id), greatest(challenger_id, challenged_id))
  where status in ('pending', 'accepted');

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_community_player_stats_updated_at
before update on community_player_stats
for each row execute function touch_updated_at();

create or replace function create_stats_for_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into community_player_stats (community_id, user_id)
  values (new.community_id, new.user_id)
  on conflict (community_id, user_id) do nothing;
  return new;
end;
$$;

create trigger create_stats_after_membership
after insert on community_memberships
for each row execute function create_stats_for_membership();

create or replace function is_community_member(target_community_id uuid, target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from community_memberships
    where community_id = target_community_id and user_id = target_user_id
  );
$$;

create or replace function is_community_admin(target_community_id uuid, target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from community_memberships
    where community_id = target_community_id and user_id = target_user_id and role = 'admin'
  );
$$;

create or replace function email_matches_domain(profile_id uuid, allowed_domain text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select lower(split_part(email, '@', 2)) = lower(allowed_domain)
  from profiles
  where id = profile_id;
$$;

create or replace function validate_challenge_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_community_member(new.community_id, new.challenger_id) then
    raise exception 'challenger is not a member of this community';
  end if;

  if not is_community_member(new.community_id, new.challenged_id) then
    raise exception 'challenged player is not a member of this community';
  end if;

  return new;
end;
$$;

create trigger validate_challenge_membership_before_insert
before insert on challenges
for each row execute function validate_challenge_membership();

create or replace function join_community(target_community_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  community_row communities;
  current_profile profiles;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into community_row from communities where id = target_community_id;
  if not found then
    raise exception 'community not found';
  end if;

  select * into current_profile from profiles where id = auth.uid();
  if not found then
    raise exception 'profile not found';
  end if;

  if community_row.visibility = 'domain_restricted'
    and not email_matches_domain(auth.uid(), community_row.allowed_email_domain) then
    raise exception 'email domain is not allowed for this community';
  end if;

  insert into community_memberships (community_id, user_id, role)
  values (target_community_id, auth.uid(), 'member')
  on conflict (community_id, user_id) do nothing;
end;
$$;

create or replace function submit_result(target_challenge_id uuid, winner_profile_id uuid)
returns results
language plpgsql
security definer
set search_path = public
as $$
declare
  challenge_row challenges;
  loser_profile_id uuid;
  winner_stats community_player_stats;
  loser_stats community_player_stats;
  expected_winner numeric;
  expected_loser numeric;
  winner_new_rating integer;
  loser_new_rating integer;
  inserted_result results;
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

  if challenge_row.status <> 'accepted' then
    raise exception 'results can only be submitted for accepted challenges';
  end if;

  if auth.uid() not in (challenge_row.challenger_id, challenge_row.challenged_id) then
    raise exception 'only involved players can submit a result';
  end if;

  if winner_profile_id not in (challenge_row.challenger_id, challenge_row.challenged_id) then
    raise exception 'winner must be one of the challenge players';
  end if;

  loser_profile_id := case
    when winner_profile_id = challenge_row.challenger_id then challenge_row.challenged_id
    else challenge_row.challenger_id
  end;

  select * into winner_stats
  from community_player_stats
  where community_id = challenge_row.community_id and user_id = winner_profile_id
  for update;

  select * into loser_stats
  from community_player_stats
  where community_id = challenge_row.community_id and user_id = loser_profile_id
  for update;

  if winner_stats.id is null or loser_stats.id is null then
    raise exception 'missing community player stats';
  end if;

  expected_winner := 1 / (1 + power(10, (loser_stats.elo_rating - winner_stats.elo_rating)::numeric / 400));
  expected_loser := 1 / (1 + power(10, (winner_stats.elo_rating - loser_stats.elo_rating)::numeric / 400));
  winner_new_rating := round(winner_stats.elo_rating + 32 * (1 - expected_winner));
  loser_new_rating := round(loser_stats.elo_rating + 32 * (0 - expected_loser));

  insert into results (
    challenge_id,
    community_id,
    winner_id,
    loser_id,
    submitted_by,
    winner_elo_before,
    loser_elo_before,
    winner_elo_after,
    loser_elo_after
  )
  values (
    challenge_row.id,
    challenge_row.community_id,
    winner_profile_id,
    loser_profile_id,
    auth.uid(),
    winner_stats.elo_rating,
    loser_stats.elo_rating,
    winner_new_rating,
    loser_new_rating
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

  update challenges
  set status = 'completed', completed_at = now()
  where id = challenge_row.id;

  return inserted_result;
end;
$$;

alter table profiles enable row level security;
alter table communities enable row level security;
alter table community_memberships enable row level security;
alter table community_player_stats enable row level security;
alter table challenges enable row level security;
alter table results enable row level security;

create policy "profiles are readable by authenticated users"
  on profiles for select
  to authenticated
  using (true);

create policy "users can insert their own profile"
  on profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "users can update their own profile"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "communities are readable by authenticated users"
  on communities for select
  to authenticated
  using (true);

create policy "users can create communities"
  on communities for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "admins can update their communities"
  on communities for update
  to authenticated
  using (is_community_admin(id, auth.uid()))
  with check (is_community_admin(id, auth.uid()));

create policy "members can read memberships in their communities"
  on community_memberships for select
  to authenticated
  using (is_community_member(community_id, auth.uid()));

create policy "users can join allowed communities as themselves"
  on community_memberships for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (
      exists (
        select 1 from communities c
        where c.id = community_id
          and (
            c.visibility = 'public'
            or email_matches_domain(auth.uid(), c.allowed_email_domain)
            or c.created_by = auth.uid()
          )
      )
    )
  );

create policy "admins can add members"
  on community_memberships for insert
  to authenticated
  with check (is_community_admin(community_id, auth.uid()));

create policy "admins can update memberships"
  on community_memberships for update
  to authenticated
  using (is_community_admin(community_id, auth.uid()))
  with check (is_community_admin(community_id, auth.uid()));

create policy "members can read stats in their communities"
  on community_player_stats for select
  to authenticated
  using (is_community_member(community_id, auth.uid()));

create policy "users can read involved community challenges"
  on challenges for select
  to authenticated
  using (
    is_community_member(community_id, auth.uid())
    and (challenger_id = auth.uid() or challenged_id = auth.uid())
  );

create policy "users can create challenges as themselves"
  on challenges for insert
  to authenticated
  with check (
    challenger_id = auth.uid()
    and challenged_id <> auth.uid()
    and status = 'pending'
    and is_community_member(community_id, challenger_id)
    and is_community_member(community_id, challenged_id)
  );

create policy "challenged players can accept or decline pending challenges"
  on challenges for update
  to authenticated
  using (challenged_id = auth.uid() and status = 'pending')
  with check (challenged_id = auth.uid() and status in ('accepted', 'declined'));

create policy "challengers can cancel pending challenges"
  on challenges for update
  to authenticated
  using (challenger_id = auth.uid() and status = 'pending')
  with check (challenger_id = auth.uid() and status = 'canceled');

create policy "members can read community results"
  on results for select
  to authenticated
  using (is_community_member(community_id, auth.uid()));
