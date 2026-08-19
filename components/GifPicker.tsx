"use client";

import { useEffect, useState } from "react";

type GiphyItem = {
  id: string;
  images: {
    fixed_width: { url: string };
    original: { url: string };
  };
};

export default function GifPicker({
  onSelect,
  onClose,
}: {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GiphyItem[]>([]);
  const [loading, setLoading] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;

  useEffect(() => {
    if (!apiKey) return;

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const endpoint = query.trim()
          ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(
              query
            )}&limit=20&rating=pg-13&lang=pt`
          : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=20&rating=pg-13`;
        const res = await fetch(endpoint);
        const data = await res.json();
        setResults(data.data || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [query, apiKey]);

  if (!apiKey) {
    return (
      <div className="w-80 rounded-lg bg-panel p-4 text-xs text-muted shadow-xl ring-1 ring-black/30">
        Pra usar GIFs, configura a variável{" "}
        <code className="text-white">NEXT_PUBLIC_GIPHY_API_KEY</code> no
        <code className="text-white"> .env.local</code> (tem free tier em{" "}
        <a
          href="https://developers.giphy.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline"
        >
          developers.giphy.com
        </a>
        ).
        <button
          onClick={onClose}
          className="mt-3 w-full rounded bg-panelLight py-1.5 text-white"
        >
          Fechar
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[26rem] w-96 flex-col rounded-lg bg-panel p-3 shadow-xl ring-1 ring-black/30">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar GIF..."
        className="mb-2 w-full rounded bg-panelLight px-3 py-2 text-sm text-white outline-none placeholder:text-muted"
      />
      <div className="grid flex-1 auto-rows-[7.5rem] grid-cols-2 gap-2 overflow-y-auto pr-1">
        {loading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg bg-panelLight"
            />
          ))}
        {!loading &&
          results.map((gif) => (
            <button
              key={gif.id}
              onClick={() => onSelect(gif.images.original.url)}
              className="group overflow-hidden rounded-lg bg-panelLight ring-0 transition hover:ring-2 hover:ring-accent"
            >
              <img
                src={gif.images.fixed_width.url}
                alt="GIF"
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
            </button>
          ))}
        {!loading && results.length === 0 && (
          <div className="col-span-2 py-6 text-center text-xs text-muted">
            Nada encontrado
          </div>
        )}
      </div>
    </div>
  );
}
