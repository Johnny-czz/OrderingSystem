-- 线上表补列：dishes 新增 source（出处作者）。幂等，可重复执行。
alter table public.dishes add column if not exists source text not null default '';
