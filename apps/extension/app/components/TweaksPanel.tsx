import { ACCENTS, type AccentName, IconButton, IconClose, Segmented, Swatch } from '@compass/ui';
import { useShell } from '@app/state/shell.js';

/** Floating tweaks panel for theme, accent, density. */
export function TweaksPanel() {
  const { tweaksOpen, setTweaksOpen, theme, accent, density, setTheme, setAccent, setDensity } =
    useShell();

  if (!tweaksOpen) {
    return (
      <button
        type="button"
        onClick={() => setTweaksOpen(true)}
        className="fixed right-6 bottom-6 z-[49] px-3.5 py-2.5 rounded-full bg-[var(--ink)] text-[var(--bg)] font-mono text-[10px] uppercase tracking-[0.02em] shadow-[var(--sh-2)]"
      >
        Tweaks
      </button>
    );
  }

  return (
    <div className="fixed right-6 bottom-6 z-50 bg-[var(--panel)] border border-[var(--hair)] rounded-[14px] shadow-[var(--sh-3)] w-[280px] overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-[var(--hair)] font-serif text-[15px]">
        <span>Tweaks</span>
        <IconButton aria-label="Close tweaks" onClick={() => setTweaksOpen(false)}>
          <IconClose size={14} />
        </IconButton>
      </div>
      <div className="px-3.5 py-3 flex flex-col gap-3.5">
        <div className="flex items-center justify-between gap-2.5">
          <label className="text-[12.5px] text-[var(--ink-2)]">Theme</label>
          <Segmented
            aria-label="Theme"
            options={[
              { label: 'Light', value: 'light' },
              { label: 'Dark', value: 'dark' },
            ]}
            value={theme}
            onChange={setTheme}
          />
        </div>
        <div className="flex items-center justify-between gap-2.5">
          <label className="text-[12.5px] text-[var(--ink-2)]">Accent</label>
          <div className="flex gap-1.5">
            {(Object.keys(ACCENTS) as AccentName[]).map((k) => {
              const a = ACCENTS[k];
              return (
                <Swatch
                  key={k}
                  label={k}
                  color={`oklch(${a.l} ${a.c} ${a.h})`}
                  active={accent === k}
                  onClick={() => setAccent(k)}
                />
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2.5">
          <label className="text-[12.5px] text-[var(--ink-2)]">Density</label>
          <Segmented
            aria-label="Density"
            options={[
              { label: 'Spacious', value: 'spacious' },
              { label: 'Compact', value: 'compact' },
            ]}
            value={density}
            onChange={setDensity}
          />
        </div>
      </div>
    </div>
  );
}
