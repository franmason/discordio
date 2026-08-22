"use client";

export type DialogState =
  | { kind: "alert"; message: string }
  | { kind: "confirm"; message: string; onConfirm: () => void };

export default function ConfirmDialog({
  state,
  onClose,
}: {
  state: DialogState | null;
  onClose: () => void;
}) {
  if (!state) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-lg bg-panel p-5 shadow-xl ring-1 ring-black/30"
      >
        <p className="text-sm text-gray-100">{state.message}</p>
        <div className="mt-4 flex justify-end gap-2">
          {state.kind === "confirm" && (
            <button
              type="button"
              onClick={onClose}
              className="rounded px-3 py-1.5 text-sm text-muted hover:bg-panelLight hover:text-white"
            >
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (state.kind === "confirm") state.onConfirm();
              onClose();
            }}
            className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-black hover:bg-accentHover"
          >
            {state.kind === "confirm" ? "Apagar" : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
