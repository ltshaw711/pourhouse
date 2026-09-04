// Cocktail detail — PRD §7: read and use one recipe (favorite, edit, duplicate, related)

export default async function CocktailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-zinc-50">Cocktail detail</h1>
      <p className="mt-2 text-zinc-400">Cocktail id: {id}</p>
    </main>
  );
}
