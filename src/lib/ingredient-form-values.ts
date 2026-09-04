// Same useActionState-echo pattern as CocktailActionState: a validation
// error hands the submitted values back through state so the form's own
// fields render in place — no redirect, no lost input.
export type IngredientFormValues = {
  canonical_name?: string;
  category?: string;
  aliasesText?: string; // comma-separated, as typed — parsed server-side
};

export type IngredientActionState = {
  error?: string;
  values?: IngredientFormValues;
} | null;
