-- KDL CRM v2. Run after database/kdl-crm.sql. Safe to run more than once.
--
-- Adds email/RFC to contacts, required date/photo/channel to quotes, multi-item
-- quotes in kdl_create_quote, and a privacy-preserving folio lookup RPC.

begin;

alter table public.contacts
  add column if not exists email text,
  add column if not exists rfc text;

alter table public.quotes
  add column if not exists required_date date,
  add column if not exists photo_url text,
  add column if not exists channel text;

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
    first_name, company, whatsapp, city, email, rfc
  ) values (
    p->>'contact_id', v_created_at, v_created_at, v_created_at, v_created_at,
    coalesce(nullif(p->>'source', ''), 'kdl_web'),
    coalesce(nullif(p->>'original_source', ''), 'kdl_web'),
    coalesce(nullif(p->>'contact_status', ''), 'new'),
    nullif(p->>'owner_user_id', ''),
    coalesce(nullif(p->>'consent_status', ''), 'not_recorded'),
    p->>'name', nullif(p->>'company', ''), p->>'whatsapp', nullif(p->>'city', ''),
    nullif(lower(trim(p->>'email')), ''), nullif(upper(trim(p->>'rfc')), '')
  )
  on conflict (contact_id) do update set
    updated_at = excluded.updated_at,
    last_interaction_at = excluded.last_interaction_at,
    contact_status = excluded.contact_status,
    company = coalesce(excluded.company, contacts.company),
    city = coalesce(excluded.city, contacts.city),
    email = coalesce(excluded.email, contacts.email),
    rfc = coalesce(excluded.rfc, contacts.rfc);

  insert into public.quotes (
    quote_id, public_folio, idempotency_key, contact_id, created_at, updated_at,
    expires_at, quote_status, source, created_by, catalog_version, form, page,
    category, urgency, machine_down, message, file_name,
    required_date, photo_url, channel
  ) values (
    p->>'quote_id', p->>'public_folio', p->>'idempotency_key', p->>'contact_id',
    v_created_at, v_created_at, nullif(p->>'expires_at', '')::timestamptz,
    coalesce(nullif(p->>'quote_status', ''), 'requested'),
    coalesce(nullif(p->>'source', ''), 'kdl_web'),
    coalesce(nullif(p->>'created_by', ''), 'website'),
    nullif(p->>'catalog_version', ''), coalesce(nullif(p->>'form', ''), 'quote'),
    nullif(p->>'page', ''), nullif(p->>'category', ''), nullif(p->>'urgency', ''),
    nullif(p->>'machineDown', ''), nullif(p->>'message', ''), nullif(p->>'fileName', ''),
    nullif(p->>'required_date', '')::date, nullif(p->>'photo_url', ''),
    nullif(p->>'channel', '')
  );

  if jsonb_typeof(p->'items') = 'array' and jsonb_array_length(p->'items') > 0 then
    insert into public.quote_items (
      quote_item_id, quote_id, product_id, manual_reference, product_name,
      brand, part_number, quantity, application, urgency, notes
    )
    select
      (p->>'quote_id') || '_item_' || t.ordinality,
      p->>'quote_id',
      nullif(t.item->>'sku', ''),
      nullif(t.item->>'manual_reference', ''),
      coalesce(nullif(t.item->>'model', ''), nullif(t.item->>'title', '')),
      nullif(t.item->>'brand', ''),
      nullif(t.item->>'model', ''),
      coalesce(
        case when coalesce(t.item->>'quantity', '') ~ '^[0-9]+([.][0-9]+)?$'
          then nullif((t.item->>'quantity')::numeric, 0)
        end,
        1
      ),
      nullif(p->>'application', ''),
      nullif(p->>'urgency', ''),
      null
    from jsonb_array_elements(p->'items') with ordinality as t(item, ordinality)
    where jsonb_typeof(t.item) = 'object';
  elsif nullif(p->>'part', '') is not null or v_quantity is not null then
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
    jsonb_build_object('source', p->>'source', 'form', p->>'form', 'channel', p->>'channel')
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

-- Public folio lookup. Returns null unless the folio exists AND the last four
-- digits of the contact's WhatsApp match, so a wrong phone is indistinguishable
-- from an unknown folio. The output never contains personal data.
create or replace function public.kdl_lookup_quote(p_folio text, p_phone_last4 text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_quote public.quotes%rowtype;
  v_phone text;
  v_items jsonb;
begin
  if p_folio is null or p_phone_last4 is null or p_phone_last4 !~ '^[0-9]{4}$' then
    return null;
  end if;

  select * into v_quote
  from public.quotes
  where public_folio = upper(trim(p_folio))
  limit 1;

  if not found then
    return null;
  end if;

  select regexp_replace(coalesce(c.whatsapp, ''), '[^0-9]', '', 'g') into v_phone
  from public.contacts c
  where c.contact_id = v_quote.contact_id;

  if v_phone is null or length(v_phone) < 4 or right(v_phone, 4) <> p_phone_last4 then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', coalesce(i.product_name, i.manual_reference),
        'quantity', i.quantity
      )
      order by i.created_at, length(i.quote_item_id), i.quote_item_id
    ),
    '[]'::jsonb
  ) into v_items
  from public.quote_items i
  where i.quote_id = v_quote.quote_id;

  return jsonb_build_object(
    'public_folio', v_quote.public_folio,
    'quote_status', v_quote.quote_status,
    'created_at', v_quote.created_at,
    'updated_at', v_quote.updated_at,
    'items', v_items
  );
end;
$$;

revoke all on function public.kdl_create_quote(jsonb) from public;
revoke all on function public.kdl_create_quote(jsonb) from anon, authenticated;
grant execute on function public.kdl_create_quote(jsonb) to service_role;

revoke all on function public.kdl_lookup_quote(text, text) from public;
revoke all on function public.kdl_lookup_quote(text, text) from anon, authenticated;
grant execute on function public.kdl_lookup_quote(text, text) to service_role;

commit;
