/**
 * Puts text on the clipboard. Resolves `false` rather than throwing when
 * the system won't allow it, so the caller can say so and leave the text
 * selectable instead.
 *
 * The async Clipboard API is tried first. Where it is missing or refused —
 * some webviews only grant it under conditions a desktop app can't always
 * meet — the older copy command is tried on a throwaway, off-screen field.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the copy command.
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.top = "-9999px";
  document.body.appendChild(field);
  try {
    field.select();
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
  }
}
