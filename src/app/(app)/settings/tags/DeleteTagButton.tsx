"use client";

export function DeleteTagButton({
  action,
}: {
  action: (formData: FormData) => void;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        // Unlike ingredient deletion, this isn't a soft fallback — the
        // tag is removed from every cocktail carrying it, not just the
        // taxonomy list.
        if (
          !confirm(
            "Delete this tag? It will be removed from every cocktail currently tagged with it — this can't be undone."
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="text-sm text-red-400 hover:text-red-300">
        Delete
      </button>
    </form>
  );
}
