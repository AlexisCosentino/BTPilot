import type { EntrySubtype } from "../types";

type SubtypeToggleProps = {
  value: EntrySubtype;
  onChange: (value: EntrySubtype) => void;
};

export function EntrySubtypeToggles({ value, onChange }: SubtypeToggleProps) {
  const options: { value: EntrySubtype; label: string }[] = [
    { value: "task", label: "Tache a faire" },
    { value: "client_change", label: "Demande du client" }
  ];

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        Categorie (optionnel)
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <label
              key={option.value}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold shadow-sm transition ${
                isSelected
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-gray-200 bg-white text-text-main hover:border-brand/30 hover:text-brand"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={isSelected}
                onChange={() => onChange(isSelected ? null : option.value)}
              />
              <span
                className={`flex h-4 w-4 items-center justify-center rounded border ${
                  isSelected ? "border-brand bg-brand text-white" : "border-gray-300 bg-white"
                }`}
                aria-hidden="true"
              >
                {isSelected ? "X" : ""}
              </span>
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
