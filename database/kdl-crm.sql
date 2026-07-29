begin;

create extension if not exists pgcrypto;

create table if not exists public.contacts (
  contact_id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_contact_at timestamptz not null default now(),
  last_interaction_at timestamptz not null default now(),
  source text not null,
  original_source text not null,
  contact_status text not null default 'new',
  owner_user_id text,
  consent_status text not null default 'not_recorded',
  first_name text not null,
  company text,
  whatsapp text not null,
  city text
);

create table if not exists public.quotes (
  quote_id text primary key,
  public_folio text not null unique,
  idempotency_key text not null unique,
  contact_id text not null references public.contacts(contact_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  quote_status text not null default 'requested',
  source text not null,
  created_by text not null,
  catalog_version text,
  form text not null,
  page text,
  category text,
  urgency text,
  machine_down text,
  message text,
  file_name text
);

create table if not exists public.quote_items (
  quote_item_id text primary key,
  quote_id text not null references public.quotes(quote_id) on delete cascade,
  product_id text,
  manual_reference text,
  product_name text,
  brand text,
  part_number text,
  quantity numeric,
  application text,
  urgency text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_events (
  activity_event_id uuid primary key default gen_random_uuid(),
  contact_id text references public.contacts(contact_id),
  quote_id text references public.quotes(quote_id),
  event_type text not null,
  actor_type text not null,
  actor_id text,
  occurred_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.quote_events (
  quote_event_id uuid primary key default gen_random_uuid(),
  quote_id text not null references public.quotes(quote_id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  actor_type text not null,
  actor_id text,
  occurred_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.audit_logs (
  audit_log_id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  action text not null,
  actor_type text not null,
  actor_id text,
  occurred_at timestamptz not null default now(),
  before_data jsonb,
  after_data jsonb
);

create table if not exists public.assignment_history (
  assignment_history_id uuid primary key default gen_random_uuid(),
  contact_id text references public.contacts(contact_id),
  quote_id text references public.quotes(quote_id),
  previous_owner_user_id text,
  owner_user_id text,
  assigned_by text,
  assigned_at timestamptz not null default now(),
  reason text
);

create table if not exists public.status_history (
  status_history_id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  previous_status text,
  status text not null,
  changed_by text not null,
  changed_at timestamptz not null default now(),
  reason text
);

create index if not exists contacts_last_interaction_idx on public.contacts(last_interaction_at desc);
create index if not exists quotes_contact_idx on public.quotes(contact_id, created_at desc);
create index if not exists quote_items_quote_idx on public.quote_items(quote_id);
create index if not exists activity_events_quote_idx on public.activity_events(quote_id, occurred_at);
create index if not exists quote_events_quote_idx on public.quote_events(quote_id, occurred_at);

alter table public.contacts enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.activity_events enable row level security;
alter table public.quote_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.assignment_history enable row level security;
alter table public.status_history enable row level security;

create or replace function public.kdl_create_quote(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.quotes%rowtype;
  v_created_at timestamptz;
  v_quantity numeric;
begin
  select * into v_existing
  from public.quotes
  where idempotency_key = nullif(trim(p->>'idempotency_key'), '')
  limit 1;

  if found then
    return jsonb_build_object(
      'duplicate', true,
      'quote_id', v_existing.quote_id,
      'contact_id', v_existing.contact_id,
      'public_folio', v_existing.public_folio,
      'quote_status', v_existing.quote_status,
      'created_at', v_existing.created_at
    );
  end if;

  v_created_at := coalesce(nullif(p->>'created_at', '')::timestamptz, now());
  begin
    v_quantity := nullif(p->>'quantity', '')::numeric;
  exception when invalid_text_representation then
    v_quantity := null;
  end;

  insert into public.contacts (
    contact_id, created_at, updated_at, first_contact_at, last_interaction_at,
    source, original_source, contact_status, owner_user_id, consent_status,
    first_name, company, whatsapp, city
  ) values (
    p->>'contact_id', v_created_at, v_created_at, v_created_at, v_created_at,
    coalesce(nullif(p->>'source', ''), 'kdl_web'),
    coalesce(nullif(p->>'original_source', ''), 'kdl_web'),
    coalesce(nullif(p->>'contact_status', ''), 'new'),
    nullif(p->>'owner_user_id', ''),
    coalesce(nullif(p->>'consent_status', ''), 'not_recorded'),
    p->>'name', nullif(p->>'company', ''), p->>'whatsapp', nullif(p->>'city', '')
  )
  on conflict (contact_id) do update set
    updated_at = excluded.updated_at,
    last_interaction_at = excluded.last_interaction_at,
    contact_status = excluded.contact_status,
    company = coalesce(excluded.company, contacts.company),
    city = coalesce(excluded.city, contacts.city);

  insert into public.quotes (
    quote_id, public_folio, idempotency_key, contact_id, created_at, updated_at,
    expires_at, quote_status, source, created_by, catalog_version, form, page,
    category, urgency, machine_down, message, file_name
  ) values (
    p->>'quote_id', p->>'public_folio', p->>'idempotency_key', p->>'contact_id',
    v_created_at, v_created_at, nullif(p->>'expires_at', '')::timestamptz,
    coalesce(nullif(p->>'quote_status', ''), 'requested'),
    coalesce(nullif(p->>'source', ''), 'kdl_web'),
    coalesce(nullif(p->>'created_by', ''), 'website'),
    nullif(p->>'catalog_version', ''), coalesce(nullif(p->>'form', ''), 'quote'),
    nullif(p->>'page', ''), nullif(p->>'category', ''), nullif(p->>'urgency', ''),
    nullif(p->>'machineDown', ''), nullif(p->>'message', ''), nullif(p->>'fileName', '')
  );

  if nullif(p->>'part', '') is not null or v_quantity is not null then
    insert into public.quote_items (
      quote_item_id, quote_id, product_id, manual_reference, product_name,
      brand, part_number, quantity, application, urgency, notes
    ) values (
      (p->>'quote_id') || '_item_1', p->>'quote_id', nullif(p->>'product_id', ''),
      nullif(p->>'part', ''), nullif(p->>'product_name', ''),
      nullif(p->>'brand', ''), nullif(p->>'part_number', ''), v_quantity,
      nullif(p->>'application', ''), nullif(p->>'urgency', ''), nullif(p->>'message', '')
    );
  end if;

  insert into public.activity_events (
    contact_id, quote_id, event_type, actor_type, actor_id, occurred_at, payload
  ) values (
    p->>'contact_id', p->>'quote_id', 'quote_requested',
    coalesce(nullif(p->>'actor_type', ''), 'system'),
    nullif(p->>'created_by', ''), v_created_at,
    jsonb_build_object('source', p->>'source', 'form', p->>'form')
  );

  insert into public.quote_events (
    quote_id, event_type, from_status, to_status, actor_type, actor_id, occurred_at
  ) values (
    p->>'quote_id', 'created', null,
    coalesce(nullif(p->>'quote_status', ''), 'requested'),
    coalesce(nullif(p->>'actor_type', ''), 'system'),
    nullif(p->>'created_by', ''), v_created_at
  );

  insert into public.status_history (
    entity_type, entity_id, previous_status, status, changed_by, changed_at, reason
  ) values (
    'quote', p->>'quote_id', null,
    coalesce(nullif(p->>'quote_status', ''), 'requested'),
    coalesce(nullif(p->>'created_by', ''), 'website'),
    v_created_at, 'Solicitud creada desde el sitio KDL'
  );

  insert into public.audit_logs (
    entity_type, entity_id, action, actor_type, actor_id, occurred_at, after_data
  ) values (
    'quote', p->>'quote_id', 'create',
    coalesce(nullif(p->>'actor_type', ''), 'system'),
    nullif(p->>'created_by', ''), v_created_at,
    jsonb_build_object(
      'public_folio', p->>'public_folio',
      'quote_status', coalesce(nullif(p->>'quote_status', ''), 'requested'),
      'source', coalesce(nullif(p->>'source', ''), 'kdl_web')
    )
  );

  return jsonb_build_object(
    'duplicate', false,
    'quote_id', p->>'quote_id',
    'contact_id', p->>'contact_id',
    'public_folio', p->>'public_folio',
    'quote_status', coalesce(nullif(p->>'quote_status', ''), 'requested'),
    'created_at', v_created_at
  );
end;
$$;

revoke all on function public.kdl_create_quote(jsonb) from public;
grant execute on function public.kdl_create_quote(jsonb) to service_role;

commit;
