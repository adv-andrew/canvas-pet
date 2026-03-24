-- Canvas Pet canonical schema
-- Established: 2026-03-24
-- This file represents the full desired database state.
-- Run this on a fresh Supabase project; it is NOT an incremental diff.
-- If migrating an existing project with saved_assignments data, first insert
-- placeholder canvas_users rows for each distinct user_canvas_id before
-- applying the foreign key constraint.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- canvas_users
-- ---------------------------------------------------------------------------

create table if not exists canvas_users (
  id               uuid        primary key default gen_random_uuid(),
  canvas_user_id   text        unique not null,
  institution_url  text        not null,
  email            text,
  display_name     text,
  happiness_score  integer     not null default 50 check (happiness_score >= 0 and happiness_score <= 100),
  reward_points    integer     not null default 0  check (reward_points >= 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Composite uniqueness: one canvas account per institution per Supabase user
create unique index if not exists canvas_users_canvas_user_id_institution_url_idx
  on canvas_users (canvas_user_id, institution_url);

-- Auto-update updated_at on every row change
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger canvas_users_set_updated_at
  before update on canvas_users
  for each row execute procedure set_updated_at();

-- ---------------------------------------------------------------------------
-- saved_assignments
-- ---------------------------------------------------------------------------

create table if not exists saved_assignments (
  id               uuid        primary key default gen_random_uuid(),
  canvas_user_id   text        not null references canvas_users (canvas_user_id) on delete cascade,
  institution_url  text        not null,
  assignment_id    integer     not null,
  plannable_type   text        not null,
  course_id        integer,
  saved_at         timestamptz not null default now(),

  constraint saved_assignments_unique unique (canvas_user_id, institution_url, assignment_id)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table canvas_users     enable row level security;
alter table saved_assignments enable row level security;

-- canvas_users: each Supabase Auth user can only see and modify their own row.
-- happiness_score and reward_points are excluded from client UPDATE via policy
-- predicate — the service role key (backend only) bypasses RLS entirely.

create policy "canvas_users_select_own"
  on canvas_users for select
  using (auth.uid() = id);

create policy "canvas_users_insert_own"
  on canvas_users for insert
  with check (auth.uid() = id);

create policy "canvas_users_update_own"
  on canvas_users for update
  using (auth.uid() = id)
  -- Prevent clients from changing gamified columns; only the service role can.
  with check (
    auth.uid() = id
    and happiness_score is not distinct from (select happiness_score from canvas_users where id = auth.uid())
    and reward_points    is not distinct from (select reward_points    from canvas_users where id = auth.uid())
  );

-- saved_assignments: users may only touch rows belonging to their Canvas account.

create policy "saved_assignments_select_own"
  on saved_assignments for select
  using (
    canvas_user_id in (
      select canvas_user_id from canvas_users where id = auth.uid()
    )
  );

create policy "saved_assignments_insert_own"
  on saved_assignments for insert
  with check (
    canvas_user_id in (
      select canvas_user_id from canvas_users where id = auth.uid()
    )
  );

create policy "saved_assignments_delete_own"
  on saved_assignments for delete
  using (
    canvas_user_id in (
      select canvas_user_id from canvas_users where id = auth.uid()
    )
  );
