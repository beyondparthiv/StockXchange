/**
 * The product name, in one place so the header, the auth screens, and the
 * Supabase-not-configured notice can't drift apart.
 *
 * `onChrome` is for the dark terminal bar, where the canvas-coloured halo
 * would be the wrong colour and isn't needed anyway — the bar is opaque.
 */
export function Wordmark({
  className = "",
  onChrome = false,
}: {
  className?: string;
  onChrome?: boolean;
}) {
  return (
    <span className={`${onChrome ? "font-semibold tracking-tight" : "wordmark"} ${className}`}>
      Stock
      <span className={onChrome ? "text-up" : "wordmark-x"}>Xchange</span>
    </span>
  );
}
