/**
 * Hand-written to match supabase/migrations/0001_init.sql. Once the project
 * is linked, regenerate from the live schema instead of hand-editing:
 *
 *   supabase gen types typescript --linked > src/types/database.ts
 */

export type CocktailStatus = "draft" | "published" | "archived";
export type TagType = "primary" | "style" | "custom";
export type ImportBatchStatus = "pending" | "processing" | "completed" | "failed";
export type ImportItemStatus =
  | "needs_review"
  | "approved"
  | "skipped"
  | "duplicate"
  | "imported";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      ingredients: {
        Row: {
          id: string;
          canonical_name: string;
          normalized_name: string;
          category: string | null;
          aliases: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ingredients"]["Row"]> & {
          canonical_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["ingredients"]["Row"]>;
      };
      tags: {
        Row: {
          id: string;
          owner_id: string | null;
          name: string;
          normalized_name: string;
          type: TagType;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["tags"]["Row"]> & {
          name: string;
          type: TagType;
        };
        Update: Partial<Database["public"]["Tables"]["tags"]["Row"]>;
      };
      cocktails: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          normalized_name: string;
          description: string | null;
          instructions: string | null;
          garnish: string | null;
          glassware: string | null;
          source: string | null;
          favorite: boolean;
          photo_url: string | null;
          status: CocktailStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["cocktails"]["Row"]> & {
          owner_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["cocktails"]["Row"]>;
      };
      recipe_ingredients: {
        Row: {
          id: string;
          cocktail_id: string;
          canonical_ingredient_id: string | null;
          display_name: string;
          amount: number | null;
          unit: string | null;
          qualifier: string | null;
          note: string | null;
          position: number;
        };
        Insert: Partial<
          Database["public"]["Tables"]["recipe_ingredients"]["Row"]
        > & {
          cocktail_id: string;
          display_name: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["recipe_ingredients"]["Row"]
        >;
      };
      cocktail_tags: {
        Row: { cocktail_id: string; tag_id: string };
        Insert: { cocktail_id: string; tag_id: string };
        Update: Partial<{ cocktail_id: string; tag_id: string }>;
      };
      import_batches: {
        Row: {
          id: string;
          owner_id: string;
          source: string;
          uploaded_at: string;
          status: ImportBatchStatus;
          summary: Record<string, number>;
          retention_expires_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["import_batches"]["Row"]
        > & {
          owner_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["import_batches"]["Row"]>;
      };
      import_items: {
        Row: {
          id: string;
          batch_id: string;
          raw_source: string;
          parsed: Record<string, unknown>;
          confidence: number | null;
          status: ImportItemStatus;
          matched_cocktail_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["import_items"]["Row"]> & {
          batch_id: string;
          raw_source: string;
        };
        Update: Partial<Database["public"]["Tables"]["import_items"]["Row"]>;
      };
    };
  };
}
