-- Add username to profiles and relax full_name
alter table profiles
  add column if not exists username text;

-- Generate usernames for existing rows
update profiles
set username = lower(regexp_replace(coalesce(username, full_name, email, 'user'), '[^a-zA-Z0-9]+', '-', 'g'))
       || '-' || substr(md5(random()::text), 1, 6)
where username is null;

-- Allow full_name to be null
alter table profiles alter column full_name drop not null;

-- Enforce username presence and uniqueness
alter table profiles alter column username set not null;
create unique index if not exists idx_profiles_username on profiles(username);
