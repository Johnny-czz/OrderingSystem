-- 收藏表：按成员隔离，每人收藏自己的菜品。幂等，可重复执行。
create table if not exists public.favorites (
  id           text primary key,
  member_id    text not null default '',
  dish_id      text not null default '',
  created_at   bigint not null default 0
);
create unique index if not exists favorites_member_dish_uniq on public.favorites (member_id, dish_id);
create index if not exists favorites_member_idx on public.favorites (member_id);
grant select, insert, update, delete on public.favorites to anon, authenticated;
alter table public.favorites enable row level security;
drop policy if exists favorites_all_family on public.favorites;
create policy favorites_all_family on public.favorites for all to anon, authenticated using (true) with check (true);
alter table public.favorites replica identity full;
