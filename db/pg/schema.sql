-- 家庭点餐 · CloudBase PostgreSQL 模式建表脚本
-- 用法：控制台「数据库 → SQL 编辑器」粘贴执行，或用 CLI：tcb db execute -e <envId> --file ./db/pg/schema.sql
-- 说明：家庭内部使用，权限放宽为 anon / authenticated 可读写（靠应用层控制角色）

create table if not exists public.dishes (
  id            text primary key,
  name          text not null,
  category      text not null default '荤菜',
  description   text not null default '',
  cover_url     text not null default '',
  source        text not null default '',
  ingredients   jsonb not null default '[]'::jsonb,
  steps         jsonb not null default '[]'::jsonb,
  tags          jsonb not null default '[]'::jsonb,
  spicy_level   integer not null default 0,
  available     boolean not null default true,
  sort          integer not null default 0,
  created_at    bigint not null default 0
);

create table if not exists public.members (
  id            text primary key,
  name          text not null,
  role          text not null default 'member',
  username      text,
  password_salt text,
  password_hash text,
  color         text not null default '',
  active        boolean not null default true,
  created_at    bigint not null default 0
);

create table if not exists public.settings (
  id                          text primary key,
  family_name                 text not null default '我家餐桌',
  notice                      text not null default '',
  auth_mode                   text not null default 'guest',
  admin_username              text not null default 'admin',
  admin_salt                  text not null default '',
  admin_password_hash         text not null default '',
  admin_must_change_password  boolean not null default false
);

create table if not exists public.rounds (
  id          text primary key,
  date        text not null default '',
  title       text not null default '今日餐桌',
  status      text not null default 'open',
  created_by  text not null default '',
  created_at  bigint not null default 0,
  closed_at   bigint
);
create index if not exists rounds_status_idx on public.rounds (status);

create table if not exists public.orders (
  id           text primary key,
  round_id     text not null default '',
  member_id    text not null default '',
  member_name  text not null default '',
  dish_id      text not null default '',
  dish_name    text not null default '',
  qty          integer not null default 1,
  note         text not null default '',
  status       text not null default 'pending',
  created_at   bigint not null default 0
);
create index if not exists orders_round_idx on public.orders (round_id);
create index if not exists orders_created_idx on public.orders (created_at desc);

create table if not exists public.wishes (
  id           text primary key,
  name         text not null,
  reason       text not null default '',
  proposed_by  text not null default '',
  votes        jsonb not null default '[]'::jsonb,
  status       text not null default 'pending',
  created_at   bigint not null default 0
);

create table if not exists public.favorites (
  id           text primary key,
  member_id    text not null default '',
  dish_id      text not null default '',
  created_at   bigint not null default 0
);
create unique index if not exists favorites_member_dish_uniq on public.favorites (member_id, dish_id);
create index if not exists favorites_member_idx on public.favorites (member_id);

-- 权限：家庭内部自用，登录（含匿名登录）用户可读写
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.dishes   to anon, authenticated;
grant select, insert, update, delete on public.members  to anon, authenticated;
grant select, insert, update, delete on public.settings to anon, authenticated;
grant select, insert, update, delete on public.rounds   to anon, authenticated;
grant select, insert, update, delete on public.orders   to anon, authenticated;
grant select, insert, update, delete on public.wishes   to anon, authenticated;
grant select, insert, update, delete on public.favorites to anon, authenticated;

alter table public.dishes   enable row level security;
alter table public.members  enable row level security;
alter table public.settings enable row level security;
alter table public.rounds   enable row level security;
alter table public.orders   enable row level security;
alter table public.wishes   enable row level security;
alter table public.favorites enable row level security;

drop policy if exists dishes_all_family on public.dishes;
create policy dishes_all_family on public.dishes for all to anon, authenticated using (true) with check (true);
drop policy if exists members_all_family on public.members;
create policy members_all_family on public.members for all to anon, authenticated using (true) with check (true);
drop policy if exists settings_all_family on public.settings;
create policy settings_all_family on public.settings for all to anon, authenticated using (true) with check (true);
drop policy if exists rounds_all_family on public.rounds;
create policy rounds_all_family on public.rounds for all to anon, authenticated using (true) with check (true);
drop policy if exists orders_all_family on public.orders;
create policy orders_all_family on public.orders for all to anon, authenticated using (true) with check (true);
drop policy if exists wishes_all_family on public.wishes;
create policy wishes_all_family on public.wishes for all to anon, authenticated using (true) with check (true);
drop policy if exists favorites_all_family on public.favorites;
create policy favorites_all_family on public.favorites for all to anon, authenticated using (true) with check (true);

-- 实时订阅（家人点完管理员立刻看到）需要表开启 REPLICA IDENTITY
alter table public.orders replica identity full;
alter table public.rounds replica identity full;
alter table public.dishes replica identity full;
