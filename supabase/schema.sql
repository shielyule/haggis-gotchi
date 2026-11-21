-- Kiro - Haggis-gotchi live public schema, generated 2026-11-21 with:
--   supabase db dump --linked --schema public -f supabase/schema.sql
-- Reference only: the migrations in supabase/migrations are the source of truth. Never run supabase db push.




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."check_ins_protect_action"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    if new.action = 'photo_treat' then
      new.action := null; -- only the photo-treat function records treats
    end if;
    new.treat_id := null;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."check_ins_protect_action"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."children_protect_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions'
    AS $$
begin
  if tg_op = 'INSERT' then
    if new.public_id is null then
      new.public_id := lower(encode(gen_random_bytes(5), 'hex'));
    end if;
    if new.born_at is null then new.born_at := now(); end if;
    if new.span_ends_at is null then new.span_ends_at := new.born_at + interval '42 days'; end if;
  end if;

  if coalesce(auth.role(), '') = 'service_role'
     or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.living_on := 'mother';
    new.transfer_code := null;
    new.transfer_expires_at := null;
    new.home_device_id := null;
    new.last_treat_day := null;
    new.life_xp := 0;
    new.weather_applied := '{}';
    new.public_id := lower(encode(gen_random_bytes(5), 'hex'));
    new.born_at := now();
    new.span_ends_at := now() + interval '42 days';
    new.departed_at := null;
    new.ghost_opt_in := null;
    new.tone := null;
    new.epitaph := null;
    return new;
  end if;

  if new.egg_id is distinct from old.egg_id
     or new.carer_id is distinct from old.carer_id
     or new.temperament_id is distinct from old.temperament_id then
    raise exception 'A Haggling''s identity cannot be changed';
  end if;

  new.living_on := old.living_on;
  new.transfer_code := old.transfer_code;
  new.transfer_expires_at := old.transfer_expires_at;
  new.home_device_id := old.home_device_id;
  new.last_treat_day := old.last_treat_day;
  new.public_id := old.public_id;
  new.born_at := old.born_at;
  new.span_ends_at := old.span_ends_at;
  new.departed_at := old.departed_at;
  new.ghost_opt_in := old.ghost_opt_in;
  new.tone := old.tone;
  new.epitaph := old.epitaph;
  new.life_xp := greatest(coalesce(new.life_xp, 0), old.life_xp);
  new.weather_applied := array(
    select distinct x
      from unnest(coalesce(old.weather_applied, '{}') || coalesce(new.weather_applied, '{}')) as x
     order by x
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."children_protect_columns"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_child_by_code"("p_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_fails int;
  v_child uuid;
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Sign in first.');
  end if;

  select count(*) into v_fails
    from public.claim_attempts
   where kind = 'code_fail' and key = v_uid::text and at > now() - interval '15 minutes';
  if v_fails >= 5 then
    return jsonb_build_object('ok', false, 'error', 'Too many tries. Wait 15 minutes, then try again.');
  end if;

  update public.children
     set living_on = 'phone', transfer_code = null, transfer_expires_at = null
   where transfer_code = v_code
     and carer_id = v_uid
     and transfer_expires_at > now()
  returning id into v_child;

  if v_child is null then
    insert into public.claim_attempts (kind, key) values ('code_fail', v_uid::text);
    return jsonb_build_object('ok', false,
      'error', 'That code did not work. Check it, or make a new one on your nest.');
  end if;

  return jsonb_build_object('ok', true, 'child_id', v_child);
end;
$$;


ALTER FUNCTION "public"."claim_child_by_code"("p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_my_eggs_by_email"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_email text;
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  v_email := lower(trim(coalesce(auth.jwt()->>'email', '')));
  if v_email = '' then
    return 0;
  end if;

  insert into public.carers (id, display_name)
  values (auth.uid(), split_part(v_email, '@', 1))
  on conflict (id) do nothing;

  update public.eggs
  set carer_id = auth.uid()
  where carer_id is null
    and lower(email) = v_email;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;


ALTER FUNCTION "public"."claim_my_eggs_by_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_push_subscription"("p_endpoint" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  delete from public.push_subscriptions where endpoint = p_endpoint and carer_id = auth.uid();
  return found;
end;
$$;


ALTER FUNCTION "public"."delete_push_subscription"("p_endpoint" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."eggs_protect_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if coalesce(auth.role(), '') = 'service_role'
     or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;
  if old.carer_id is not null and new.carer_id is distinct from old.carer_id then
    raise exception 'egg owner cannot be changed';
  end if;
  new.email := old.email;
  new.ready_code_sent_at := old.ready_code_sent_at;
  new.demo := old.demo;
  return new;
end;
$$;


ALTER FUNCTION "public"."eggs_protect_columns"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.carers (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mint_transfer_code"("p_child_id" "uuid") RETURNS TABLE("code" "text", "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 32 symbols, no 0/O/1/I
  v_code text;
  v_bytes bytea;
  v_exp timestamptz := now() + interval '7 days';
  i int;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;
  perform 1 from public.children where id = p_child_id and carer_id = auth.uid();
  if not found then
    raise exception 'Not found.' using errcode = '42501';
  end if;

  loop
    v_bytes := gen_random_bytes(6);
    v_code := '';
    for i in 0..5 loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
    end loop;
    begin
      update public.children
         set transfer_code = v_code, transfer_expires_at = v_exp
       where id = p_child_id;
      exit;
    exception when unique_violation then
      null; -- code already in use somewhere: draw again
    end;
  end loop;

  return query select v_code, v_exp;
end;
$$;


ALTER FUNCTION "public"."mint_transfer_code"("p_child_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."public_feed"() RETURNS TABLE("carer_name" "text", "haggling_name" "text", "action" "text", "treat_id" "text", "at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with ev as (
    select ci.at, ci.action, ci.treat_id, ci.carer_id, ci.child_id,
           left(c.name, 40) as hname,
           left(coalesce(nullif(trim(e.answers->>'displayName'), ''), 'A carer'), 40) as cname
      from public.check_ins ci
      join public.children c on c.id = ci.child_id
      join public.eggs e on e.id = c.egg_id
      join public.carers k on k.id = ci.carer_id
     where k.show_in_feed
       and ci.action in ('feed', 'cuddle', 'walk', 'treat', 'clean', 'photo_treat', 'sleep', 'play')
       and ci.at > now() - interval '48 hours'
  ), marked as (
    select ev.*, lag(ev.at) over (partition by ev.carer_id, ev.child_id, ev.action order by ev.at) as prev
      from ev
  )
  select m.cname, m.hname, m.action, m.treat_id, m.at
    from marked m
   where (m.prev is null or m.at - m.prev > interval '10 minutes')
     and not exists (
       select 1 from public.feed_blocklist b
        where lower(m.cname) like '%' || b.word || '%' or lower(m.hname) like '%' || b.word || '%'
     )
   order by m.at desc
   limit 10
$$;


ALTER FUNCTION "public"."public_feed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."public_graveyard"() RETURNS TABLE("name" "text", "temperament_id" "text", "days_lived" integer, "tone" "text", "epitaph" "text", "departed_at" timestamp with time zone, "public_id" "text", "ghost" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select g.name, g.temperament_id, g.days_lived, g.tone, g.epitaph, g.departed_at,
         case when c.share_enabled then c.public_id end, coalesce(c.ghost_opt_in, false)
    from public.graveyard_entries g
    join public.children c on c.id = g.child_id
   where not exists (
     select 1 from public.feed_blocklist b
      where lower(g.name) like '%' || b.word || '%' or lower(g.epitaph) like '%' || b.word || '%'
   )
   order by g.departed_at desc
   limit 100
$$;


ALTER FUNCTION "public"."public_graveyard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."public_haggling"("p_public_id" "text") RETURNS TABLE("name" "text", "temperament_id" "text", "life_xp" numeric, "hunger" integer, "mood" integer, "energy" integer, "mess" integer, "health_xp" integer, "hatched_at" timestamp with time zone, "share_enabled" boolean, "departed_at" timestamp with time zone, "epitaph" "text", "ghost" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
  select
    case when c.share_enabled then c.name end,
    case when c.share_enabled then c.temperament_id end,
    case when c.share_enabled then c.life_xp end,
    case when c.share_enabled then c.hunger end,
    case when c.share_enabled then c.mood end,
    case when c.share_enabled then c.energy end,
    case when c.share_enabled then c.mess end,
    case when c.share_enabled then c.health_xp end,
    case when c.share_enabled then c.created_at end,
    c.share_enabled,
    case when c.share_enabled then c.departed_at end,
    case when c.share_enabled then c.epitaph end,
    case when c.share_enabled then coalesce(c.ghost_opt_in, false) end
  from public.children c
  where p_public_id ~ '^[a-f0-9]{10}$'
    and c.public_id = p_public_id
$_$;


ALTER FUNCTION "public"."public_haggling"("p_public_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_egg"("p_id" "uuid", "p_ready_at" timestamp with time zone, "p_story_id" "text", "p_answers" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_email text;
begin
  v_email := lower(trim(coalesce(p_answers->>'email', '')));
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'email required';
  end if;

  insert into public.eggs (
    id, carer_id, created_at, ready_at, status, story_id, answers, email
  ) values (
    p_id,
    auth.uid(), -- null if not signed in yet
    now(),
    p_ready_at,
    'waiting',
    p_story_id,
    p_answers,
    v_email
  )
  on conflict (id) do update set
    ready_at = excluded.ready_at,
    story_id = excluded.story_id,
    answers = excluded.answers,
    email = excluded.email;

  return p_id;
end;
$$;


ALTER FUNCTION "public"."register_egg"("p_id" "uuid", "p_ready_at" timestamp with time zone, "p_story_id" "text", "p_answers" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."return_child_to_nest"("p_child_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if auth.uid() is null then
    return false;
  end if;
  update public.children
     set living_on = 'mother', transfer_code = null, transfer_expires_at = null
   where id = p_child_id and carer_id = auth.uid();
  return found;
end;
$$;


ALTER FUNCTION "public"."return_child_to_nest"("p_child_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
  tbl name;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        SELECT c.relname INTO tbl FROM pg_catalog.pg_class c WHERE c.oid = cmd.objid;
        EXECUTE format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_push_subscription"("p_endpoint" "text", "p_p256dh" "text", "p_auth" "text", "p_timezone" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if auth.uid() is null or p_endpoint !~ '^https://' then
    return false;
  end if;
  insert into public.carers (id) values (auth.uid()) on conflict (id) do nothing;
  -- One device, one subscription: whoever is signed in on it now owns it.
  insert into public.push_subscriptions (carer_id, endpoint, p256dh, auth, timezone)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, coalesce(nullif(p_timezone, ''), 'Europe/London'))
  on conflict (endpoint) do update
    set carer_id = excluded.carer_id, p256dh = excluded.p256dh,
        auth = excluded.auth, timezone = excluded.timezone;
  return true;
end;
$$;


ALTER FUNCTION "public"."save_push_subscription"("p_endpoint" "text", "p_p256dh" "text", "p_auth" "text", "p_timezone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_home_device"("p_child_id" "uuid", "p_device_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
begin
  if auth.uid() is null or p_device_id !~ '^[A-Za-z0-9-]{8,64}$' then
    return false;
  end if;
  update public.children
     set home_device_id = p_device_id, living_on = 'phone'
   where id = p_child_id and carer_id = auth.uid();
  return found;
end;
$_$;


ALTER FUNCTION "public"."set_home_device"("p_child_id" "uuid", "p_device_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_quiet_hours"("p_on" boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if auth.uid() is null or p_on is null then
    return false;
  end if;
  update public.push_subscriptions set quiet_hours = p_on where carer_id = auth.uid();
  return found;
end;
$$;


ALTER FUNCTION "public"."set_quiet_hours"("p_on" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_show_in_feed"("p_show" boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if auth.uid() is null or p_show is null then
    return false;
  end if;
  insert into public.carers (id) values (auth.uid()) on conflict (id) do nothing;
  update public.carers set show_in_feed = p_show where id = auth.uid();
  return found;
end;
$$;


ALTER FUNCTION "public"."set_show_in_feed"("p_show" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_weather_location"("p_lat" numeric, "p_lon" numeric, "p_timezone" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if auth.uid() is null then
    return false;
  end if;
  insert into public.carers (id) values (auth.uid()) on conflict (id) do nothing;
  update public.carers
     set weather_consent = (p_lat is not null and p_lon is not null),
         weather_lat = case when p_lat is null then null else round(greatest(-90, least(90, p_lat)), 1) end,
         weather_lon = case when p_lon is null then null else round(greatest(-180, least(180, p_lon)), 1) end,
         timezone = nullif(left(coalesce(p_timezone, ''), 64), '')
   where id = auth.uid();
  return found;
end;
$$;


ALTER FUNCTION "public"."set_weather_location"("p_lat" numeric, "p_lon" numeric, "p_timezone" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."carers" (
    "id" "uuid" NOT NULL,
    "display_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "weather_consent" boolean DEFAULT false NOT NULL,
    "weather_lat" numeric(4,1),
    "weather_lon" numeric(5,1),
    "timezone" "text",
    "show_in_feed" boolean DEFAULT false NOT NULL,
    CONSTRAINT "carers_timezone_check" CHECK (("length"("timezone") <= 64)),
    CONSTRAINT "carers_weather_lat_check" CHECK ((("weather_lat" >= ('-90'::integer)::numeric) AND ("weather_lat" <= (90)::numeric))),
    CONSTRAINT "carers_weather_lon_check" CHECK ((("weather_lon" >= ('-180'::integer)::numeric) AND ("weather_lon" <= (180)::numeric)))
);


ALTER TABLE "public"."carers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."check_ins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "child_id" "uuid" NOT NULL,
    "carer_id" "uuid" NOT NULL,
    "surface" "text" NOT NULL,
    "hunger" integer NOT NULL,
    "mood" integer NOT NULL,
    "energy" integer NOT NULL,
    "mess" integer NOT NULL,
    "at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "action" "text",
    "treat_id" "text",
    CONSTRAINT "check_ins_action_check" CHECK (("action" = ANY (ARRAY['feed'::"text", 'cuddle'::"text", 'walk'::"text", 'treat'::"text", 'clean'::"text", 'photo_treat'::"text", 'weather'::"text", 'sleep'::"text", 'play'::"text", 'scold'::"text"]))),
    CONSTRAINT "check_ins_surface_check" CHECK (("surface" = ANY (ARRAY['mother'::"text", 'phone'::"text", 'pi'::"text"]))),
    CONSTRAINT "check_ins_treat_id_check" CHECK (("treat_id" = ANY (ARRAY['irn-bru'::"text", 'bagpipes'::"text", 'kilt'::"text", 'heather'::"text", 'shortbread'::"text"])))
);


ALTER TABLE "public"."check_ins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."children" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "egg_id" "uuid" NOT NULL,
    "carer_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "temperament_id" "text" NOT NULL,
    "breakfast_hour" integer NOT NULL,
    "dinner_hour" integer NOT NULL,
    "bed_hour" integer NOT NULL,
    "hunger" integer DEFAULT 72 NOT NULL,
    "mood" integer DEFAULT 78 NOT NULL,
    "energy" integer DEFAULT 70 NOT NULL,
    "mess" integer DEFAULT 12 NOT NULL,
    "living_on" "text" DEFAULT 'mother'::"text" NOT NULL,
    "last_tick_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "transfer_code" "text",
    "transfer_expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "home_device_id" "text",
    "health_xp" integer DEFAULT 50 NOT NULL,
    "life_xp" numeric(10,2) DEFAULT 0 NOT NULL,
    "last_treat_day" "text",
    "weather_applied" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "public_id" "text",
    "share_enabled" boolean DEFAULT false NOT NULL,
    "born_at" timestamp with time zone,
    "span_ends_at" timestamp with time zone,
    "departed_at" timestamp with time zone,
    "ghost_opt_in" boolean,
    "tone" "text",
    "epitaph" "text",
    "asleep_until" timestamp with time zone,
    "sex" "text",
    CONSTRAINT "children_bed_hour_check" CHECK ((("bed_hour" >= 0) AND ("bed_hour" <= 23))),
    CONSTRAINT "children_breakfast_hour_check" CHECK ((("breakfast_hour" >= 0) AND ("breakfast_hour" <= 23))),
    CONSTRAINT "children_dinner_hour_check" CHECK ((("dinner_hour" >= 0) AND ("dinner_hour" <= 23))),
    CONSTRAINT "children_energy_check" CHECK ((("energy" >= 0) AND ("energy" <= 100))),
    CONSTRAINT "children_epitaph_check" CHECK (("length"("epitaph") <= 300)),
    CONSTRAINT "children_health_xp_check" CHECK ((("health_xp" >= '-100'::integer) AND ("health_xp" <= 100))),
    CONSTRAINT "children_hunger_check" CHECK ((("hunger" >= 0) AND ("hunger" <= 100))),
    CONSTRAINT "children_life_xp_check" CHECK (("life_xp" >= (0)::numeric)),
    CONSTRAINT "children_living_on_check" CHECK (("living_on" = ANY (ARRAY['mother'::"text", 'phone'::"text"]))),
    CONSTRAINT "children_mess_check" CHECK ((("mess" >= 0) AND ("mess" <= 100))),
    CONSTRAINT "children_mood_check" CHECK ((("mood" >= 0) AND ("mood" <= 100))),
    CONSTRAINT "children_sex_check" CHECK (("sex" = ANY (ARRAY['male'::"text", 'female'::"text"]))),
    CONSTRAINT "children_tone_check" CHECK (("tone" = ANY (ARRAY['bright'::"text", 'dim'::"text", 'dark'::"text"])))
);


ALTER TABLE "public"."children" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."claim_attempts" (
    "id" bigint NOT NULL,
    "kind" "text" NOT NULL,
    "key" "text" NOT NULL,
    "at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "claim_attempts_kind_check" CHECK (("kind" = ANY (ARRAY['claim_email'::"text", 'claim_ip'::"text", 'code_fail'::"text", 'photo_check'::"text"])))
);


ALTER TABLE "public"."claim_attempts" OWNER TO "postgres";


ALTER TABLE "public"."claim_attempts" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."claim_attempts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."eggs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "carer_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ready_at" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'waiting'::"text" NOT NULL,
    "story_id" "text",
    "answers" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "email" "text",
    "ready_code_sent_at" timestamp with time zone,
    "demo" boolean DEFAULT false NOT NULL,
    CONSTRAINT "eggs_status_check" CHECK (("status" = ANY (ARRAY['waiting'::"text", 'ready'::"text", 'hatched'::"text"])))
);


ALTER TABLE "public"."eggs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feed_blocklist" (
    "word" "text" NOT NULL,
    CONSTRAINT "feed_blocklist_word_check" CHECK (("word" = "lower"("word")))
);


ALTER TABLE "public"."feed_blocklist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."graveyard_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "child_id" "uuid" NOT NULL,
    "carer_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "temperament_id" "text" NOT NULL,
    "born_at" timestamp with time zone NOT NULL,
    "departed_at" timestamp with time zone NOT NULL,
    "days_lived" integer NOT NULL,
    "tone" "text" NOT NULL,
    "epitaph" "text" NOT NULL,
    "last_pages" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."graveyard_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "carer_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "timezone" "text" DEFAULT 'Europe/London'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "quiet_hours" boolean DEFAULT false NOT NULL,
    CONSTRAINT "push_subscriptions_auth_check" CHECK (("length"("auth") <= 100)),
    CONSTRAINT "push_subscriptions_endpoint_check" CHECK ((("length"("endpoint") >= 10) AND ("length"("endpoint") <= 1000))),
    CONSTRAINT "push_subscriptions_p256dh_check" CHECK (("length"("p256dh") <= 200)),
    CONSTRAINT "push_subscriptions_timezone_check" CHECK (("length"("timezone") <= 64))
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reminder_log" (
    "key" "text" NOT NULL,
    "at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reminder_log_key_check" CHECK (("length"("key") <= 200))
);


ALTER TABLE "public"."reminder_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scrapbook_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "child_id" "uuid" NOT NULL,
    "carer_id" "uuid" NOT NULL,
    "at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "text" "text" NOT NULL
);


ALTER TABLE "public"."scrapbook_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weather_readings" (
    "id" bigint NOT NULL,
    "carer_id" "uuid" NOT NULL,
    "slot_id" "text" NOT NULL,
    "bucket" "text" NOT NULL,
    "temp_c" numeric(4,1),
    "wind_kmh" numeric(5,1),
    "code" integer,
    "place" "text" DEFAULT 'your area'::"text" NOT NULL,
    "at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "weather_readings_place_check" CHECK (("length"("place") <= 40)),
    CONSTRAINT "weather_readings_slot_id_check" CHECK (("slot_id" ~ '^\d{4}-\d{2}-\d{2}-(am|pm|eve)$'::"text"))
);


ALTER TABLE "public"."weather_readings" OWNER TO "postgres";


ALTER TABLE "public"."weather_readings" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."weather_readings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."carers"
    ADD CONSTRAINT "carers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."children"
    ADD CONSTRAINT "children_egg_id_key" UNIQUE ("egg_id");



ALTER TABLE ONLY "public"."children"
    ADD CONSTRAINT "children_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."children"
    ADD CONSTRAINT "children_public_id_key" UNIQUE ("public_id");



ALTER TABLE ONLY "public"."children"
    ADD CONSTRAINT "children_transfer_code_key" UNIQUE ("transfer_code");



ALTER TABLE ONLY "public"."claim_attempts"
    ADD CONSTRAINT "claim_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."eggs"
    ADD CONSTRAINT "eggs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feed_blocklist"
    ADD CONSTRAINT "feed_blocklist_pkey" PRIMARY KEY ("word");



ALTER TABLE ONLY "public"."graveyard_entries"
    ADD CONSTRAINT "graveyard_entries_child_id_key" UNIQUE ("child_id");



ALTER TABLE ONLY "public"."graveyard_entries"
    ADD CONSTRAINT "graveyard_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_endpoint_key" UNIQUE ("endpoint");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reminder_log"
    ADD CONSTRAINT "reminder_log_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."scrapbook_entries"
    ADD CONSTRAINT "scrapbook_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weather_readings"
    ADD CONSTRAINT "weather_readings_carer_id_slot_id_key" UNIQUE ("carer_id", "slot_id");



ALTER TABLE ONLY "public"."weather_readings"
    ADD CONSTRAINT "weather_readings_pkey" PRIMARY KEY ("id");



CREATE INDEX "check_ins_child_id_idx" ON "public"."check_ins" USING "btree" ("child_id", "at" DESC);



CREATE INDEX "children_carer_id_idx" ON "public"."children" USING "btree" ("carer_id");



CREATE INDEX "children_transfer_code_idx" ON "public"."children" USING "btree" ("transfer_code");



CREATE INDEX "claim_attempts_lookup_idx" ON "public"."claim_attempts" USING "btree" ("kind", "key", "at" DESC);



CREATE INDEX "eggs_carer_id_idx" ON "public"."eggs" USING "btree" ("carer_id");



CREATE INDEX "eggs_ready_notify_idx" ON "public"."eggs" USING "btree" ("ready_at") WHERE (("ready_code_sent_at" IS NULL) AND ("status" = ANY (ARRAY['waiting'::"text", 'ready'::"text"])));



CREATE INDEX "graveyard_departed_idx" ON "public"."graveyard_entries" USING "btree" ("departed_at" DESC);



CREATE INDEX "push_subscriptions_carer_idx" ON "public"."push_subscriptions" USING "btree" ("carer_id");



CREATE INDEX "scrapbook_child_id_idx" ON "public"."scrapbook_entries" USING "btree" ("child_id", "at" DESC);



CREATE OR REPLACE TRIGGER "check_ins_protect_action_trg" BEFORE INSERT OR UPDATE ON "public"."check_ins" FOR EACH ROW EXECUTE FUNCTION "public"."check_ins_protect_action"();



CREATE OR REPLACE TRIGGER "children_protect_columns_trg" BEFORE INSERT OR UPDATE ON "public"."children" FOR EACH ROW EXECUTE FUNCTION "public"."children_protect_columns"();



CREATE OR REPLACE TRIGGER "eggs_protect_columns_trg" BEFORE UPDATE ON "public"."eggs" FOR EACH ROW EXECUTE FUNCTION "public"."eggs_protect_columns"();



ALTER TABLE ONLY "public"."carers"
    ADD CONSTRAINT "carers_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_carer_id_fkey" FOREIGN KEY ("carer_id") REFERENCES "public"."carers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."children"
    ADD CONSTRAINT "children_carer_id_fkey" FOREIGN KEY ("carer_id") REFERENCES "public"."carers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."children"
    ADD CONSTRAINT "children_egg_id_fkey" FOREIGN KEY ("egg_id") REFERENCES "public"."eggs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."eggs"
    ADD CONSTRAINT "eggs_carer_id_fkey" FOREIGN KEY ("carer_id") REFERENCES "public"."carers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."graveyard_entries"
    ADD CONSTRAINT "graveyard_entries_carer_id_fkey" FOREIGN KEY ("carer_id") REFERENCES "public"."carers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."graveyard_entries"
    ADD CONSTRAINT "graveyard_entries_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_carer_id_fkey" FOREIGN KEY ("carer_id") REFERENCES "public"."carers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scrapbook_entries"
    ADD CONSTRAINT "scrapbook_entries_carer_id_fkey" FOREIGN KEY ("carer_id") REFERENCES "public"."carers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scrapbook_entries"
    ADD CONSTRAINT "scrapbook_entries_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weather_readings"
    ADD CONSTRAINT "weather_readings_carer_id_fkey" FOREIGN KEY ("carer_id") REFERENCES "public"."carers"("id") ON DELETE CASCADE;



ALTER TABLE "public"."carers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "carers_insert_own" ON "public"."carers" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "carers_select_own" ON "public"."carers" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "carers_update_own" ON "public"."carers" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."check_ins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "check_ins_own_all" ON "public"."check_ins" USING (("auth"."uid"() = "carer_id")) WITH CHECK (("auth"."uid"() = "carer_id"));



ALTER TABLE "public"."children" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "children_own_all" ON "public"."children" USING (("auth"."uid"() = "carer_id")) WITH CHECK (("auth"."uid"() = "carer_id"));



ALTER TABLE "public"."claim_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."eggs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "eggs_delete_own" ON "public"."eggs" FOR DELETE USING (("auth"."uid"() = "carer_id"));



CREATE POLICY "eggs_select_own" ON "public"."eggs" FOR SELECT USING ((("auth"."uid"() = "carer_id") OR ("lower"("email") = "lower"(COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text")))));



CREATE POLICY "eggs_update_own" ON "public"."eggs" FOR UPDATE USING ((("auth"."uid"() = "carer_id") OR (("carer_id" IS NULL) AND ("lower"("email") = "lower"(COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text")))))) WITH CHECK (("auth"."uid"() = "carer_id"));



ALTER TABLE "public"."feed_blocklist" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."graveyard_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "graveyard_select_own" ON "public"."graveyard_entries" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "carer_id"));



ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "push_subscriptions_select_own" ON "public"."push_subscriptions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "carer_id"));



ALTER TABLE "public"."reminder_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scrapbook_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scrapbook_own_all" ON "public"."scrapbook_entries" USING (("auth"."uid"() = "carer_id")) WITH CHECK (("auth"."uid"() = "carer_id"));



ALTER TABLE "public"."weather_readings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "weather_readings_select_own" ON "public"."weather_readings" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "carer_id"));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_child_by_code"("p_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_child_by_code"("p_code" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."claim_my_eggs_by_email"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."delete_push_subscription"("p_endpoint" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_push_subscription"("p_endpoint" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."mint_transfer_code"("p_child_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mint_transfer_code"("p_child_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."public_feed"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."public_feed"() TO "anon";
GRANT ALL ON FUNCTION "public"."public_feed"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."public_graveyard"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."public_graveyard"() TO "anon";
GRANT ALL ON FUNCTION "public"."public_graveyard"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."public_haggling"("p_public_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."public_haggling"("p_public_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."public_haggling"("p_public_id" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."register_egg"("p_id" "uuid", "p_ready_at" timestamp with time zone, "p_story_id" "text", "p_answers" "jsonb") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."return_child_to_nest"("p_child_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."return_child_to_nest"("p_child_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_push_subscription"("p_endpoint" "text", "p_p256dh" "text", "p_auth" "text", "p_timezone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_push_subscription"("p_endpoint" "text", "p_p256dh" "text", "p_auth" "text", "p_timezone" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."set_home_device"("p_child_id" "uuid", "p_device_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_home_device"("p_child_id" "uuid", "p_device_id" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."set_quiet_hours"("p_on" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_quiet_hours"("p_on" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."set_show_in_feed"("p_show" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_show_in_feed"("p_show" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."set_weather_location"("p_lat" numeric, "p_lon" numeric, "p_timezone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_weather_location"("p_lat" numeric, "p_lon" numeric, "p_timezone" "text") TO "authenticated";



GRANT ALL ON TABLE "public"."carers" TO "anon";
GRANT ALL ON TABLE "public"."carers" TO "authenticated";
GRANT ALL ON TABLE "public"."carers" TO "service_role";



GRANT ALL ON TABLE "public"."check_ins" TO "anon";
GRANT ALL ON TABLE "public"."check_ins" TO "authenticated";
GRANT ALL ON TABLE "public"."check_ins" TO "service_role";



GRANT ALL ON TABLE "public"."children" TO "anon";
GRANT ALL ON TABLE "public"."children" TO "authenticated";
GRANT ALL ON TABLE "public"."children" TO "service_role";



GRANT ALL ON TABLE "public"."claim_attempts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."claim_attempts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."eggs" TO "anon";
GRANT ALL ON TABLE "public"."eggs" TO "authenticated";
GRANT ALL ON TABLE "public"."eggs" TO "service_role";



GRANT ALL ON TABLE "public"."feed_blocklist" TO "service_role";



GRANT ALL ON TABLE "public"."graveyard_entries" TO "service_role";
GRANT SELECT ON TABLE "public"."graveyard_entries" TO "authenticated";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";
GRANT SELECT ON TABLE "public"."push_subscriptions" TO "authenticated";



GRANT ALL ON TABLE "public"."reminder_log" TO "service_role";



GRANT ALL ON TABLE "public"."scrapbook_entries" TO "anon";
GRANT ALL ON TABLE "public"."scrapbook_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."scrapbook_entries" TO "service_role";



GRANT ALL ON TABLE "public"."weather_readings" TO "service_role";
GRANT SELECT ON TABLE "public"."weather_readings" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."weather_readings_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







