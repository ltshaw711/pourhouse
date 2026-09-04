// Shared between the (server) actions.ts and the (client) CocktailForm —
// kept in a plain lib file so a "use server" module can import it without
// pulling in "use client" code.
export type CocktailFormValues = {
  name?: string;
  instructions?: string;
  garnish?: string;
  glassware?: string;
  source?: string;
  favorite?: boolean;
  photo_url?: string | null;
  ingredients?: {
    display_name: string;
    amount: number | null;
    unit: string | null;
    qualifier: string | null;
  }[];
  tagIds?: string[];
};
