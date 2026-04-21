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
  id                  uuid        primary key default gen_random_uuid(),
  canvas_user_id      text        unique not null,
  institution_url     text        not null,
  email               text,
  display_name        text,
  happiness_score     integer     not null default 80 check (happiness_score >= 0 and happiness_score <= 100),
  reward_points       integer     not null default 0  check (reward_points >= 0),
  role                text        not null default 'student' check (role in ('student', 'admin')),
  streak              integer     not null default 0  check (streak >= 0),
  canvas_token        text,
  web_user_id         uuid        unique references auth.users(id) on delete set null,
  web_display_name    text,
  web_email           text,
  privacy_consent_at  timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on column canvas_users.privacy_consent_at is
  'Timestamp when the user accepted the Privacy Policy. '
  'NULL for accounts created before v8 or pending consent. '
  'Set by the backend on sign-up or first Canvas link.';

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
  title            text,
  due_date         timestamptz,
  completed_at     timestamptz,
  saved_at         timestamptz not null default now(),

  constraint saved_assignments_unique unique (canvas_user_id, institution_url, assignment_id)
);

comment on column saved_assignments.title is
  'Assignment title cached from Canvas at save time. '
  'Stored with user consent per the Privacy Policy. '
  'Not a grade or submission record — covered by FERPA minimal storage policy.';

comment on column saved_assignments.due_date is
  'Assignment due date cached from Canvas at save time. '
  'Used to compute reward point tiers. Not a grade or submission record.';

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------

create table if not exists tasks (
  id              uuid        primary key default gen_random_uuid(),
  canvas_user_id  uuid        not null references canvas_users(id) on delete cascade,
  assignment_id   uuid        not null,
  course_id       uuid        not null,
  title           text        not null,
  description     text,
  due_date        timestamptz,
  completed       boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table canvas_users     enable row level security;
alter table saved_assignments enable row level security;
alter table tasks             enable row level security;

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
    and reward_points   is not distinct from (select reward_points   from canvas_users where id = auth.uid())
    and streak          is not distinct from (select streak          from canvas_users where id = auth.uid())
    and role            is not distinct from (select role            from canvas_users where id = auth.uid())
  );

-- saved_assignments: users may only touch rows belonging to their Canvas account.
-- INSERT requires privacy consent to be recorded (v8).

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
    canvas_user_id = (
      select canvas_user_id from canvas_users
      where id = auth.uid()
        and privacy_consent_at is not null
    )
  );

create policy "saved_assignments_delete_own"
  on saved_assignments for delete
  using (
    canvas_user_id in (
      select canvas_user_id from canvas_users where id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- shop_items
-- ---------------------------------------------------------------------------

create table if not exists shop_items (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  description text,
  cost        integer     not null check (cost >= 0),
  image_url   text,
  active      boolean     not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- user_items
-- ---------------------------------------------------------------------------

create table if not exists user_items (
  user_id     uuid        not null references canvas_users(id) on delete cascade,
  item_id     uuid        not null references shop_items(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- ---------------------------------------------------------------------------
-- Row Level Security (shop tables)
-- ---------------------------------------------------------------------------

alter table shop_items enable row level security;
alter table user_items enable row level security;

-- anyone can browse the shop
create policy "shop_items_select_all" on shop_items
  for select using (true);

-- users can only see their own purchases
create policy "user_items_select_own" on user_items
  for select using (user_id in (select id from canvas_users where id = auth.uid()));

-- No INSERT policy on user_items. All purchases go through the backend
-- service-role client after verifying point balance.

-- ---------------------------------------------------------------------------
-- pinned_assignments
-- ---------------------------------------------------------------------------

create table if not exists pinned_assignments (
  canvas_user_id  text        not null,
  institution_url text        not null,
  assignment_id   integer     not null,
  pinned_at       timestamptz not null default now(),
  primary key (canvas_user_id, institution_url, assignment_id),
  foreign key (canvas_user_id) references canvas_users(canvas_user_id) on delete cascade
);

alter table pinned_assignments enable row level security;

create policy "pinned_assignments_select_own" on pinned_assignments
  for select using (
    canvas_user_id in (
      select canvas_user_id from canvas_users where id = auth.uid()
    )
  );

-- No INSERT/DELETE policies — all writes go through the backend service role.
