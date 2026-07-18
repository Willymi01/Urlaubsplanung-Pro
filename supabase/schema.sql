create extension if not exists pgcrypto;

create table if not exists public.app_state (
  workspace_id text primary key,
  access_hash text not null,
  payload jsonb,
  revision bigint not null default 0,
  updated_at timestamptz not null default now(),
  updated_by text not null default 'unbekannt'
);

create table if not exists public.app_state_history (
  id bigint generated always as identity primary key,
  workspace_id text not null,
  payload jsonb not null,
  revision bigint not null,
  updated_at timestamptz not null default now(),
  updated_by text not null
);

alter table public.app_state enable row level security;
alter table public.app_state_history enable row level security;
revoke all on public.app_state from anon, authenticated;
revoke all on public.app_state_history from anon, authenticated;

create or replace function public.initialize_workspace(p_workspace_id text, p_access_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r public.app_state;
begin
  if length(coalesce(p_access_code,'')) < 8 then raise exception 'ACCESS_CODE_TOO_SHORT'; end if;
  insert into public.app_state(workspace_id,access_hash)
  values (p_workspace_id, crypt(p_access_code, gen_salt('bf')))
  on conflict (workspace_id) do nothing;
  select * into r from public.app_state where workspace_id=p_workspace_id;
  if r.access_hash <> crypt(p_access_code,r.access_hash) then raise exception 'ACCESS_DENIED'; end if;
  return jsonb_build_object('revision',r.revision,'updated_at',r.updated_at);
end $$;

create or replace function public.get_app_state(p_workspace_id text, p_access_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r public.app_state;
begin
  select * into r from public.app_state where workspace_id=p_workspace_id;
  if not found then raise exception 'WORKSPACE_NOT_FOUND'; end if;
  if r.access_hash <> crypt(p_access_code,r.access_hash) then raise exception 'ACCESS_DENIED'; end if;
  return jsonb_build_object('payload',r.payload,'revision',r.revision,'updated_at',r.updated_at,'updated_by',r.updated_by);
end $$;

create or replace function public.save_app_state(p_workspace_id text,p_access_code text,p_base_revision bigint,p_device_id text,p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r public.app_state; new_revision bigint;
begin
  select * into r from public.app_state where workspace_id=p_workspace_id for update;
  if not found then raise exception 'WORKSPACE_NOT_FOUND'; end if;
  if r.access_hash <> crypt(p_access_code,r.access_hash) then raise exception 'ACCESS_DENIED'; end if;
  if r.revision <> coalesce(p_base_revision,0) then raise exception 'REVISION_CONFLICT'; end if;
  new_revision := r.revision + 1;
  update public.app_state set payload=p_payload,revision=new_revision,updated_at=now(),updated_by=left(coalesce(p_device_id,'unbekannt'),100) where workspace_id=p_workspace_id;
  insert into public.app_state_history(workspace_id,payload,revision,updated_by) values(p_workspace_id,p_payload,new_revision,left(coalesce(p_device_id,'unbekannt'),100));
  delete from public.app_state_history where workspace_id=p_workspace_id and id not in (select id from public.app_state_history where workspace_id=p_workspace_id order by id desc limit 50);
  return jsonb_build_object('revision',new_revision,'updated_at',now());
end $$;

grant execute on function public.initialize_workspace(text,text) to anon, authenticated;
grant execute on function public.get_app_state(text,text) to anon, authenticated;
grant execute on function public.save_app_state(text,text,bigint,text,jsonb) to anon, authenticated;
