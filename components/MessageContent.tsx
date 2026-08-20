"use client";

import { useState } from "react";

const YOUTUBE_RE =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/i;

const URL_RE = /(https?:\/\/[^\s]+)/g;

// Quebra o texto em pedaços de texto normal + links clicáveis
function linkify(text: string) {
  const parts = text.split(URL_RE);
  return parts.map((part, i) =>
    URL_RE.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent underline hover:text-accentHover"
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function MessageContent({
  content,
  imageUrl,
}: {
  content: string;
  imageUrl?: string | null;
}) {
  const youtubeMatch = content.match(YOUTUBE_RE);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="max-w-full">
      {content && (
        <p className="whitespace-pre-wrap break-words text-sm text-gray-100">
          {linkify(content)}
        </p>
      )}

      {youtubeMatch && (
        <div className="mt-2 aspect-video w-full max-w-full overflow-hidden rounded-lg sm:max-w-sm">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${youtubeMatch[1]}`}
            title="Vídeo incorporado"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {imageUrl && (
        <>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mt-2 block cursor-zoom-in"
          >
            <img
              src={imageUrl}
              alt="Imagem enviada no chat"
              className="max-h-80 w-auto max-w-full rounded-lg object-contain"
              loading="lazy"
            />
          </button>

          {expanded && (
            <div
              onClick={() => setExpanded(false)}
              className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-4"
            >
              <img
                src={imageUrl}
                alt="Imagem enviada no chat (ampliada)"
                className="max-h-full max-w-full rounded-lg object-contain"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
