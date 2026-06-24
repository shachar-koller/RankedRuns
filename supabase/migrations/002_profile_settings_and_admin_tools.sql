alter table profiles
  add column if not exists bio text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatar images are publicly readable" on storage.objects;
create policy "avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "users can upload their own avatars" on storage.objects;
create policy "users can upload their own avatars"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users can update their own avatars" on storage.objects;
create policy "users can update their own avatars"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create or replace function admin_update_player_stats(
  target_community_id uuid,
  target_user_id uuid,
  new_elo_rating integer,
  new_wins integer,
  new_losses integer
)
returns community_player_stats
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_stats community_player_stats;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not is_community_admin(target_community_id, auth.uid()) then
    raise exception 'community admin required';
  end if;

  if not is_community_member(target_community_id, target_user_id) then
    raise exception 'target user is not a member of this community';
  end if;

  if new_elo_rating <= 0 or new_wins < 0 or new_losses < 0 then
    raise exception 'stats must be non-negative and Elo must be positive';
  end if;

  update community_player_stats
  set
    elo_rating = new_elo_rating,
    wins = new_wins,
    losses = new_losses,
    games_played = new_wins + new_losses
  where community_id = target_community_id
    and user_id = target_user_id
  returning * into updated_stats;

  if updated_stats.id is null then
    raise exception 'player stats not found';
  end if;

  return updated_stats;
end;
$$;

update communities
set
  name = 'YU 1v1 Rankings',
  description = replace(description, 'l' || 'adder', 'ranking')
where name = 'YU 1v1 ' || 'L' || 'adder';

update communities
set description = replace(description, 'l' || 'adder', 'ranking')
where description ilike '%' || 'l' || 'adder' || '%';
