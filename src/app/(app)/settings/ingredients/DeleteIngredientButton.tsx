"use client";

export function DeleteIngredientButton({
  action,
}: {
  action: (formData: FormData) => void;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Remove this ingredient from your list?")) {
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
