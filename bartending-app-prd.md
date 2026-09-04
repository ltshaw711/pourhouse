# Product Requirements Document — Bartending App

**Product name (working):** Pourhouse  
**Platform:** Responsive web application  
**Release:** MVP  
**Document status:** Draft

## 1. Product summary

Pourhouse is a personal, web-based cocktail library that works from any modern browser. It helps people find a cocktail by name or by the ingredients they have on hand, discover adjacent drinks, and grow a well-organized collection over time. Every cocktail can be tagged by its primary ingredients, making both browsing and ingredient-led search fast and intuitive.

The initial setup includes a guided, browser-based import of a user’s Apple Notes cocktail folder. Because Apple Notes does not offer a public web API for a third-party app to read a user’s folders directly, the import will accept a folder or ZIP of notes exported from Apple Notes as Markdown, with TXT/HTML support as fallbacks. The app parses each note, presents a review screen, and imports only user-approved cocktails.

## 2. Problem and opportunity

Cocktail recipes often begin as a loose collection of notes. They are difficult to search by available ingredients, inconsistent in format, and awkward to browse for inspiration. A dedicated, attractive web app turns that collection into a searchable catalog without making adding a new recipe feel like data entry.

## 3. Goals

1. Let a user find a cocktail by name, ingredient, or a combination of ingredients in seconds.
2. Make ingredient tags reliable enough to support discovery and filtering.
3. Import an existing Apple Notes folder without requiring manual re-entry of every recipe.
4. Make adding, editing, and discovering cocktails pleasant on phone, tablet, and desktop.
5. Launch and operate the MVP at free or very low cost, while retaining a clean path beyond 250 cocktails.

## 4. Non-goals for MVP

- Social sharing, public profiles, ratings, comments, or recipe marketplace.
- Inventory quantities, shopping lists, cost calculation, or alcohol delivery.
- Native iOS/Android applications.
- AI recipe generation or automatic image creation.
- Automatic, ongoing synchronization with Apple Notes. A future Apple Notes import may be repeated manually; existing recipes must never be silently overwritten.

## 5. Users and primary jobs

**Collection owner** — maintains a personal collection and wants to retrieve a known recipe or add a new one quickly.

**At-home bartender** — starts with ingredients on hand and wants appealing, feasible options.

**Explorer** — browses by spirit, style, or related cocktails to find something new.

## 6. MVP scope and requirements

### 6.1 Account and access

- The app is hosted publicly over HTTPS and usable from current mobile and desktop browsers.
- A user can sign up and sign in with email magic link or password; OAuth sign-in may be added later.
- Each user can access only their own collection by default.
- An authenticated session persists securely across browser refreshes.

### 6.2 Cocktail library

- The library presents cocktail cards in a colorful, responsive grid with image/gradient treatment, name, primary spirit, and key tags.
- Users can switch to a compact list view.
- Each cocktail has a detail page containing ingredients, measurements, method, garnish, glassware, notes, tags, source, and optional photo.
- The library initially supports at least 250 cocktails per user and must have no application-level hard cap. The system is designed to scale to thousands of records.
- Users can create, edit, duplicate, and archive/delete a cocktail. Deletion requires confirmation.
- The app detects likely duplicates (normalized name plus materially similar ingredient list) and lets the user merge, keep both, or skip.

### 6.3 Search, filters, and discovery

- A persistent search field returns name matches as the user types. Search is case-insensitive and tolerant of partial names.
- An ingredient search accepts one or more ingredients. Results display match quality:
  - **Make now:** all selected ingredients are present.
  - **Almost:** one or more selected ingredients match and the missing ingredients are named.
- Users can filter by primary ingredient, ingredient tag, cocktail category/style, glassware, and favorites.
- Users can select ingredient chips instead of typing them.
- Cocktail detail pages suggest related recipes based on shared primary ingredients and tags.
- An optional “Surprise me” action picks a cocktail from current filters.
- Search and filters can be cleared in one action and reflected in a shareable URL for the user’s own convenience. Shared URLs do not expose private recipes to unauthenticated visitors.

### 6.4 Tags and primary ingredients

- A cocktail supports one or more **primary ingredient** tags (for example: gin, bourbon, tequila, rum, vodka, mezcal, brandy, sparkling wine, non-alcoholic).
- It also supports flexible ingredient and style tags (for example: citrus, bitter, stirred, tropical, tiki, aperitif).
- Primary-ingredient tags are selected from a managed canonical list to prevent fragmented terms such as “Bourbon” and “bourbon whiskey.”
- Ingredient aliases map during search/import (for example, “lime juice” and “fresh lime”). The original ingredient text remains visible in the recipe.
- A user can add a custom ingredient and map it to a canonical item during recipe editing.

### 6.5 Add-cocktail flow

- “Add cocktail” is available from every primary screen.
- Required fields: cocktail name and at least one ingredient line.
- Recommended structured fields: ingredient, amount, unit, preparation/qualifier, and optional note. Free-text ingredients remain supported for unusual recipes.
- The editor supports reordering ingredients, structured instructions, tags, favorite state, source, and photo upload.
- The app saves a draft locally or server-side until it is published or discarded.
- Validation explains missing or malformed required fields in plain language.

### 6.6 Apple Notes initial import

**User experience**

1. During onboarding, the app explains how to export the desired Apple Notes folder on a Mac and offers “I’ll import later.”
2. The user uploads a ZIP folder or one or more Markdown files in the browser. TXT and HTML are accepted as secondary formats; PDF is accepted only as an optional assisted/manual-review import because it is less reliable to parse.
3. The importer identifies candidate notes, previews the extracted title, ingredients, instructions, and tags, and flags uncertain fields.
4. The user can edit candidates, exclude notes, choose duplicate handling, and confirm import.
5. The system creates an import report with imported, skipped, duplicate, and needs-review counts. Original source text is retained with the import record for traceability.

**Import rules**

- One note normally becomes one cocktail; blank notes and clearly non-recipe notes are skipped.
- The note title becomes the proposed cocktail name; headings and common labels such as “Ingredients” and “Method” are recognized.
- Ingredients and amounts are parsed only when confidence is high. Ambiguous content is preserved as text and marked for review, never silently fabricated.
- Imported recipes receive `source = Apple Notes` and an import batch ID.
- Import files are encrypted in transit, processed privately, and deleted from temporary storage after the configurable retention window (default: 24 hours). They are never used to train models.

**Constraint**

The MVP is a browser upload workflow, not direct iCloud account access. Apple’s documented Notes workflows provide local export, including Markdown export on Mac, rather than a public third-party API for fetching a Notes folder. This keeps the import dependable and avoids asking users for Apple credentials. [Apple Notes export guidance](https://support.apple.com/en-gb/guide/notes/not201900c07/mac)

## 7. Information architecture

| Area | Purpose | Key actions |
|---|---|---|
| Onboarding | Establish account and import collection | Import Notes, skip, view sample collection |
| Home / Discover | Inspire and resume browsing | Search, use ingredient chips, open featured/related recipes |
| Library | Browse the complete collection | Search, filter, sort, change view |
| Cocktail detail | Read and use one recipe | Favorite, edit, duplicate, view related cocktails |
| Add / edit | Maintain the collection | Save draft, publish, tag, upload photo |
| Imports | Review import history and repeat imports | View report, resolve skipped recipes, import again |
| Settings | Manage profile and data | Export collection, manage account, delete account |

## 8. Experience and visual direction

- **Mood:** colorful, polished, and inviting—closer to a good cocktail menu than a spreadsheet.
- **Palette:** deep charcoal or midnight background, warm citrus/orange and berry accents, with accessible text contrast. Color augments labels; it is never the only signal.
- **Discovery:** prominent search, visual ingredient chips, clean card hierarchy, and related-drink paths throughout the experience.
- **Mobile first:** search and add actions remain visible on small screens; filters use a bottom sheet; recipe steps are easy to read one-handed.
- **Accessibility:** meet WCAG 2.2 AA for contrast, keyboard navigation, focus states, form labels, error messages, and screen-reader names. Respect reduced-motion preferences.

## 9. Data model (MVP)

| Entity | Key fields |
|---|---|
| User | id, email, display_name, created_at |
| Cocktail | id, owner_id, name, normalized_name, description, instructions, garnish, glassware, source, favorite, photo_url, status, timestamps |
| RecipeIngredient | id, cocktail_id, canonical_ingredient_id, display_name, amount, unit, qualifier, position |
| Ingredient | id, canonical_name, normalized_name, category, aliases |
| Tag | id, name, type (`primary`, `style`, `custom`) |
| CocktailTag | cocktail_id, tag_id |
| ImportBatch | id, owner_id, source, uploaded_at, status, summary counts |
| ImportItem | id, batch_id, raw_source, parsed fields, confidence, status, matched_cocktail_id |

Implementation notes:

- Store ingredients separately from recipes for fast many-to-many filtering.
- Index normalized cocktail name, owner ID, tag joins, and ingredient joins. Add full-text search indexing once substring/name search is insufficient.
- Store images in object storage and database references only; serve resized variants.
- Enforce per-user ownership through database row-level security, not just the UI.

## 10. Recommended technical approach

**Frontend:** Next.js/React with TypeScript, deployed as a responsive progressive web app. Use server rendering or static delivery where it improves initial load, and a component system designed for accessible controls.

**Backend and database:** Supabase PostgreSQL, Auth, Storage, and Edge Functions. PostgreSQL is a natural fit for relational recipes, ingredient/tag joins, structured search, and future growth. Row-Level Security protects each collection. The initial 250-cocktail requirement is trivial for this architecture, and growth requires no data-model replacement.

**Import service:** A server-side function receives the uploaded ZIP/files, applies file-type and size limits, extracts Markdown/TXT/HTML, parses candidates, and persists them as reviewable `ImportItem` records. The final import is committed only after user confirmation.

**Hosting:** Start with Cloudflare Pages or Vercel for the frontend and Supabase for the application backend. Cloudflare’s current Workers platform includes both free and paid plans, and its D1 documentation notes free-tier daily usage limits; it is a viable alternate all-in-one stack but is less convenient than PostgreSQL for this recipe model. [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) · [D1 usage behavior](https://developers.cloudflare.com/d1/platform/release-notes/)

**Recommendation:** Use Cloudflare Pages + Supabase for the MVP. It has minimal operational overhead, supports a custom domain, can begin on free tiers, and allows selective upgrades as real traffic or storage grows. Verify current quotas and pricing at launch; provider limits change over time.

## 11. Security, privacy, and reliability

- HTTPS everywhere; secrets stored only in managed environment configuration.
- Authenticate all write operations and enforce ownership in the database.
- Validate and size-limit uploads; reject executable content; scan/archive files defensively.
- Rate-limit sign-in, search, and import endpoints.
- Provide data export (JSON/CSV) and account/data deletion controls.
- Back up the production database daily once the service has non-test data, and test a restore before launch.
- Target 99.5% monthly availability for the MVP, excluding scheduled maintenance and provider-wide outages.

## 12. Performance requirements

- Library and cocktail detail pages reach usable content within 2.5 seconds on a typical 4G mobile connection for a 250-cocktail collection.
- Search responds within 300 ms at the 95th percentile after input settles.
- A 250-note Markdown import provides a first reviewable result within 60 seconds under normal conditions; progress is visible for longer jobs.
- Search results and image loading are paginated/lazy-loaded so a large collection remains responsive.

## 13. Success measures

| Metric | MVP target |
|---|---|
| Import completion | At least 85% of users who start import reach an import report |
| Import quality | At least 90% of imported recipes require no material correction after review |
| Search usefulness | At least 70% of searches result in a recipe detail view or filter refinement |
| Collection activation | At least 60% of new users save/import five or more cocktails in their first session |
| Ongoing use | At least 30% of activated users return within 30 days |
| Reliability | No data loss; 99.5% monthly availability target |

## 14. Launch plan

**Phase 1 — Foundation:** account access, data model, responsive library, cocktail details, add/edit flow, primary tags, name/ingredient search.

**Phase 2 — Migration:** Apple Notes export instructions, browser upload, parser, review/confirmation, duplicate handling, import reports.

**Phase 3 — Polish and release:** related recipes, favorites, accessibility audit, mobile QA, backups, error monitoring, analytics, and a small beta with representative Apple Notes exports.

## 15. Acceptance criteria

The MVP is ready to release when:

1. A new user can create an account, add a cocktail, tag its primary ingredients, and find it through name and ingredient search on phone and desktop.
2. A user can upload an exported Apple Notes folder/files through the browser, review the parsed candidates, and import selected recipes without overwriting existing records silently.
3. A collection of 250 cocktails loads, filters, and searches within the stated performance targets.
4. All private cocktail data is protected by authenticated, database-enforced ownership controls.
5. Core workflows pass keyboard and screen-reader checks and meet the stated accessibility standard.
6. Production deployment uses HTTPS, a managed database, error monitoring, and documented backup/restore procedures.

## 16. Open product decisions

1. Should the first release be strictly private, or should the owner be able to publish individual read-only recipes later?
2. Will recipes require photos at launch, or should rich color/illustration treatment make photos optional?
3. What formats and consistency levels exist in the current Apple Notes folder? A sample of 10–20 anonymized notes should be used to tune the importer before build completion.
4. Should “available ingredients” mean exact ingredients only, or include substitutions (for example, orange liqueur types)? Start exact; introduce configurable substitutions after validating need.
