-- 
-- MockEcho: Production Supabase Schema
-- 

-- 1. Create Profiles Table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null unique,
  target_role text default 'Frontend Engineer',
  preferred_mode text default 'voice',
  preferred_voice text default 'default',
  preferred_theme text default 'system',
  streak_days integer default 0,
  last_active_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

-- Profiles RLS Policies
create policy "Allow users to view their own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Allow users to update their own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Allow profile insertion on sign up" on public.profiles
  for insert with check (auth.uid() = id);


-- 2. Create Interviews Table (supports structured JSON fields for questions, answers, and feedback)
create table public.interviews (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null,
  subject text not null,
  difficulty text not null,
  question_count integer not null,
  mode text not null,
  time_mode text not null,
  total_duration_seconds integer,
  status text not null default 'pending',
  questions jsonb not null,
  answers jsonb not null default '{}'::jsonb,
  overall_feedback jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone
);

-- Enable RLS for interviews
alter table public.interviews enable row level security;

-- Interviews RLS Policies
create policy "Users can view their own interviews" on public.interviews
  for select using (auth.uid() = user_id);

create policy "Users can insert their own interviews" on public.interviews
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own interviews" on public.interviews
  for update using (auth.uid() = user_id);

create policy "Users can delete their own interviews" on public.interviews
  for delete using (auth.uid() = user_id);


-- 3. Create performance indexes
create index interviews_user_id_idx on public.interviews(user_id);
create index interviews_created_at_idx on public.interviews(created_at desc);

-- 4. Set up an automatic profile creation trigger on signup (Optional but highly recommended)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'New User'),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
