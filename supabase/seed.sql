insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'daniel@example.dev', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Daniel S."}'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ari@example.dev', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ari M."}'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'shachar@example.dev', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Shachar K."}'),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'yosef@example.dev', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Yosef K."}'),
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ezra@example.dev', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ezra L."}')
on conflict (id) do nothing;

insert into profiles (id, display_name, email)
values
  ('00000000-0000-0000-0000-000000000101', 'Daniel S.', 'daniel@example.dev'),
  ('00000000-0000-0000-0000-000000000102', 'Ari M.', 'ari@example.dev'),
  ('00000000-0000-0000-0000-000000000103', 'Shachar K.', 'shachar@example.dev'),
  ('00000000-0000-0000-0000-000000000104', 'Yosef K.', 'yosef@example.dev'),
  ('00000000-0000-0000-0000-000000000105', 'Ezra L.', 'ezra@example.dev')
on conflict (id) do update set display_name = excluded.display_name;

insert into communities (id, name, type, visibility, allowed_email_domain, description, location, created_by)
values
  ('10000000-0000-0000-0000-000000000001', 'YU 1v1 Rankings', 'university', 'domain_restricted', 'yu.edu', 'A campus 1v1 ranking for regular runs.', 'Washington Heights, NY', '00000000-0000-0000-0000-000000000103'),
  ('10000000-0000-0000-0000-000000000002', 'Washington Heights Park Runs', 'park', 'public', null, 'Pickup regulars and weekend 1v1s.', 'Washington Heights, NY', '00000000-0000-0000-0000-000000000101')
on conflict (id) do nothing;

insert into community_memberships (community_id, user_id, role)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'member'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000102', 'member'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000103', 'admin'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000104', 'member'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000105', 'member'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000101', 'admin'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000103', 'member')
on conflict (community_id, user_id) do nothing;

update community_player_stats
set elo_rating = values.elo_rating,
    games_played = values.games_played,
    wins = values.wins,
    losses = values.losses
from (
  values
    ('10000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, 1312, 12, 10, 2),
    ('10000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000102'::uuid, 1284, 11, 8, 3),
    ('10000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000103'::uuid, 1248, 10, 7, 3),
    ('10000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000104'::uuid, 1217, 10, 6, 4),
    ('10000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000105'::uuid, 1189, 10, 5, 5)
) as values(community_id, user_id, elo_rating, games_played, wins, losses)
where community_player_stats.community_id = values.community_id
  and community_player_stats.user_id = values.user_id;
