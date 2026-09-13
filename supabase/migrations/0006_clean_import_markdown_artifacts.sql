-- One-time data cleanup, not a schema change. Fixes cocktails imported
-- before src/lib/import-parser.ts learned to strip Apple Notes' "++text++"
-- underline style and "[text](url)" markdown links -- those imports kept
-- the raw markdown syntax in recipe_ingredients.display_name and
-- cocktails.instructions/garnish/description instead of the plain text.
-- Safe to re-run: the WHERE clause only matches rows that still contain
-- the artifact, so a clean row is never touched twice.

create or replace function public.tmp_strip_markdown_artifacts(input text)
returns text
language sql
immutable
as $$
  select trim(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(coalesce(input, ''), '\[([^\]]*)\]\([^)]*\)', '\1', 'g'),
          '\+{1,2}|\*{1,4}', '', 'g'
        ),
        -- Defensive: a "](url)" left with no matching opening "[" --
        -- seen in one real note where the source link itself was
        -- malformed (missing its opening bracket), so the link regex
        -- above never matched it in the first place.
        '\]\([^)]*\)', '', 'g'
      ),
      '[ \t]+', ' ', 'g'
    )
  );
$$;

update public.recipe_ingredients
set display_name = public.tmp_strip_markdown_artifacts(display_name)
where display_name ~ '\+{1,2}|\*{1,4}|\[[^\]]*\]\([^)]*\)|\]\([^)]*\)';

update public.cocktails
set instructions = public.tmp_strip_markdown_artifacts(instructions)
where instructions ~ '\+{1,2}|\*{1,4}|\[[^\]]*\]\([^)]*\)|\]\([^)]*\)';

update public.cocktails
set garnish = public.tmp_strip_markdown_artifacts(garnish)
where garnish ~ '\+{1,2}|\*{1,4}|\[[^\]]*\]\([^)]*\)|\]\([^)]*\)';

update public.cocktails
set description = public.tmp_strip_markdown_artifacts(description)
where description ~ '\+{1,2}|\*{1,4}|\[[^\]]*\]\([^)]*\)|\]\([^)]*\)';

drop function public.tmp_strip_markdown_artifacts(text);
