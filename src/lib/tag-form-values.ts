import type { TagType } from "@/types/database";

// Same useActionState-echo pattern as CocktailActionState/
// IngredientActionState: a validation error hands the submitted values
// back through state so the form's own fields render in place — no
// redirect, no lost input.
export type TagFormValues = {
  name?: string;
  // Scoped to the two taxonomy types this page manages — custom tags
  // are user-owned and created through a different flow, not this one.
  type?: Extract<TagType, "primary" | "style">;
};

export type TagActionState = {
  error?: string;
  values?: TagFormValues;
} | null;
