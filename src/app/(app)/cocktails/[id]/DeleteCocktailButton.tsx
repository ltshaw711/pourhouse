"use client";

// PRD §6.2: deletion requires confirmation.
export function DeleteCocktailButton({
  action,
}: {
  action: (formData: FormData) => void;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Delete this cocktail? This can't be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="shrink-0 rounded-full border border-red-900 px-4 py-1.5 text-sm text-red-300 hover:bg-red-950"
      >
        Delete
      </button>
    </form>
  );
}
