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

  return (
    <div className="max-w-md">
      {content && (
        <p className="whitespace-pre-wrap break-words text-sm text-gray-100">
          {linkify(content)}
        </p>
      )}

      {youtubeMatch && (
        <div className="mt-2 aspect-video w-full max-w-sm overflow-hidden rounded-lg">
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
        <a href={imageUrl} target="_blank" rel="noopener noreferrer">
          <img
            src={imageUrl}
            alt="Imagem enviada no chat"
            className="mt-2 max-h-80 max-w-sm rounded-lg object-contain"
            loading="lazy"
          />
        </a>
      )}
    </div>
  );
}
