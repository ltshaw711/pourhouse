// Parses one Apple Notes Markdown export into a structured guess.
// PRD §6.6 import rules, load-bearing constraint: "Ingredients and amounts
// are parsed only when confidence is high. Ambiguous content is preserved
// as text and marked for review, never silently fabricated." Every branch
// below either extracts something it's confident about, or falls back to
// keeping the original text untouched rather than guessing.
//
// Tuned against a real batch of exported notes rather than assumptions:
// Apple's Markdown export hard-breaks nearly every line with 1-3 trailing
// spaces, renders a Notes "Title" paragraph as `# Text` but a "Heading"
// paragraph as `****Text****` (quadruple asterisks, not a typo), and a
// large fraction of real notes turn out to be a title + a photo of a
// recipe with no extractable ingredient text at all — that's not a parser
// failure, it's what's actually in the file.

export type ParsedIngredientLine = {
  display_name: string;
  amount: number | null;
  unit: string | null;
};

export type ParsedNote = {
  name: string;
  source_url: string | null;
  instructions: string | null;
  ingredients: ParsedIngredientLine[];
  hashtags: string[];
  hasImage: boolean;
  /** 0-1. Informational for sorting/flagging — every candidate still goes
   *  through review regardless of score (PRD §6.6). */
  confidence: number;
};

/**
 * What actually gets stored in import_items.parsed — a ParsedNote plus the
 * database-dependent matching that only the caller (which has a Supabase
 * client) can do: canonical ingredient links and matched/unmatched tags.
 */
export type StoredImportItem = Omit<ParsedNote, "ingredients"> & {
  ingredients: (ParsedIngredientLine & { canonical_ingredient_id: string | null })[];
  matched_tag_ids: string[];
  unmatched_hashtags: string[];
};

const INGREDIENT_HEADINGS = new Set(["ingredients"]);
const INSTRUCTION_HEADINGS = new Set([
  "method",
  "instructions",
  "directions",
  "steps",
  "preparation",
]);

const UNIT_WORDS =
  "oz|ounces?|dashe?s?|splash(?:es)?|cups?|tsp|teaspoons?|tbsp|tablespoons?|ml|cl|barspoons?|parts?|drops?";

const UNICODE_FRACTIONS: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

// Apple's export uses three inline styles found in real notes:
// "****text****" for a Heading paragraph, "++text++" for underline, and
// a plain "[text](url)" markdown link (e.g. an ingredient the user linked
// to a recipe page). All three are stripped down to their visible text —
// an ingredient/instruction line should never show raw markdown syntax.
function stripMarkdownEmphasis(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\+{1,2}/g, "")
    .replace(/\*{1,4}/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function stripHardBreak(line: string): string {
  return line.replace(/ {1,}$/, "");
}

// Matches a section label at the start of a line, tolerating both a
// label-only line ("Ingredients", "## Directions") and a label sharing a
// line with its first line of content ("Directions: Add all ingredients
// to a shaker with ice.") — the latter is common in real exports and, if
// only exact label lines are recognized, leaves the section switch never
// happening: everything after silently keeps accumulating in whatever
// section was already open.
function matchSectionLabel(
  line: string
): { section: "ingredients" | "instructions"; rest: string } | null {
  const cleaned = stripMarkdownEmphasis(line.replace(/^#{1,6}\s*/, ""));
  for (const label of INGREDIENT_HEADINGS) {
    const match = cleaned.match(new RegExp(`^${label}\\s*:?\\s*(.*)$`, "i"));
    if (match) return { section: "ingredients", rest: match[1].trim() };
  }
  for (const label of INSTRUCTION_HEADINGS) {
    const match = cleaned.match(new RegExp(`^${label}\\s*:?\\s*(.*)$`, "i"));
    if (match) return { section: "instructions", rest: match[1].trim() };
  }
  return null;
}

function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // "1 1/2" — whole number plus a simple fraction.
  const mixed = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const [, whole, num, den] = mixed;
    return Number(whole) + Number(num) / Number(den);
  }

  // "3/4"
  const fraction = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const [, num, den] = fraction;
    return Number(num) / Number(den);
  }

  // "½", "1½"
  const unicodeMatch = trimmed.match(/^(\d+)?\s*([¼½¾⅓⅔⅛⅜⅝⅞])$/);
  if (unicodeMatch) {
    const [, whole, frac] = unicodeMatch;
    return (whole ? Number(whole) : 0) + UNICODE_FRACTIONS[frac];
  }

  // "1.3", ".75" — a leading-dot decimal (no digit before the point) is
  // common shorthand in real exports and shouldn't need the leading zero.
  if (/^\d*\.?\d+$/.test(trimmed)) return Number(trimmed);

  return null;
}

const INGREDIENT_LINE_RE = new RegExp(
  `^([\\d¼½¾⅓⅔⅛⅜⅝⅞./\\s]+?)\\s+(${UNIT_WORDS})\\b\\s*(.*)$`,
  "i"
);

function parseIngredientLine(rawLine: string): ParsedIngredientLine {
  const clean = stripMarkdownEmphasis(rawLine);
  const match = clean.match(INGREDIENT_LINE_RE);

  if (match) {
    const [, amountText, unit, rest] = match;
    const amount = parseAmount(amountText);
    if (amount != null && rest.trim()) {
      return { display_name: rest.trim(), amount, unit: unit.toLowerCase() };
    }
  }

  // No confidently-parsed amount/unit — keep the whole line as-is rather
  // than guess at splitting it (e.g. "thinly sliced Lime for garnish").
  return { display_name: clean, amount: null, unit: null };
}

// usedFallback is true only when the note had literally no non-blank
// content to read a title from — not when the extracted title happens to
// match the filename, which is the *normal* case (Apple Notes names the
// export file after the note's own title).
function extractTitle(
  lines: string[],
  fallback: string
): { title: string; usedFallback: boolean } {
  for (const line of lines) {
    const trimmed = stripHardBreak(line).trim();
    if (!trimmed) continue;

    const h1 = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (h1) return { title: h1[1].trim(), usedFallback: false };

    const bold = trimmed.match(/^\*{2,4}\s*(.+?)\s*\*{2,4}$/);
    if (bold) return { title: bold[1].trim(), usedFallback: false };

    // First non-empty line wasn't a recognizable title style — use it
    // plain rather than falling straight to the filename.
    return { title: stripMarkdownEmphasis(trimmed), usedFallback: false };
  }
  return { title: fallback, usedFallback: true };
}

export function parseAppleNoteMarkdown(raw: string, fallbackTitle: string): ParsedNote {
  const rawLines = raw.replace(/\r\n/g, "\n").split("\n").map(stripHardBreak);
  const lines = rawLines.map((l) => l.trim());

  const { title: name, usedFallback: usedFallbackTitle } = extractTitle(
    rawLines,
    fallbackTitle
  );

  const sourceMatch = raw.match(/\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/);
  const source_url = sourceMatch ? sourceMatch[1] : null;

  const hasImage = /!\[[^\]]*\]\([^)]+\)/.test(raw);

  const hashtags = [
    ...new Set(
      [...raw.matchAll(/#([a-zA-Z][\w-]*)/g)].map((m) => m[1].toLowerCase())
    ),
  ];

  const ingredients: ParsedIngredientLine[] = [];
  const instructionLines: string[] = [];
  let section: "none" | "ingredients" | "instructions" = "none";

  for (const line of lines) {
    if (!line) {
      // A blank line is just a paragraph break, not a section boundary —
      // Apple's export hard-breaks "Ingredients:" onto its own paragraph,
      // so the bulleted list always starts one blank line *after* the
      // heading. Only a real heading/hashtag/image line ends a section.
      continue;
    }

    // Section labels show up in the wild as plain text ("Ingredients:"), as
    // an actual Notes heading/subheading ("## Directions"), and sharing a
    // line with their own first line of content ("Directions: Add all
    // ingredients to a shaker with ice."). matchSectionLabel handles all
    // three and is checked *before* the generic "#"/"!" bail-out below —
    // otherwise "## Directions" is swallowed as an unrecognized heading and
    // the section switch never happens.
    const labelMatch = matchSectionLabel(line);
    if (labelMatch) {
      section = labelMatch.section;
      if (labelMatch.rest) {
        if (section === "ingredients") {
          ingredients.push(parseIngredientLine(labelMatch.rest));
        } else {
          instructionLines.push(labelMatch.rest);
        }
      }
      continue;
    }

    if (line.startsWith("#") || line.startsWith("!")) {
      if (section !== "instructions") section = "none";
      continue;
    }

    if (section === "ingredients") {
      ingredients.push(parseIngredientLine(line));
    } else if (section === "instructions") {
      instructionLines.push(stripMarkdownEmphasis(line));
    }
  }

  const instructions = instructionLines.length ? instructionLines.join("\n") : null;

  const withUnit = ingredients.filter((i) => i.amount != null && i.unit).length;
  let confidence: number;
  if (ingredients.length === 0) {
    confidence = 0.2;
  } else if (withUnit === 0) {
    confidence = 0.5;
  } else {
    confidence = 0.5 + 0.3 * (withUnit / ingredients.length);
  }
  if (usedFallbackTitle) confidence = Math.min(confidence, 0.4);

  return { name, source_url, instructions, ingredients, hashtags, hasImage, confidence };
}
