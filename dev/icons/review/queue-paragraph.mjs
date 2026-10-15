/** Replace one bounded queue paragraph while preserving all surrounding sections. */
export function replaceQueueParagraph(text, prefix, replacement) {
  const normalized = text.replaceAll("\r\n", "\n");
  const start = normalized.indexOf(prefix);
  if (start < 0) throw new Error("Expected queue paragraph not found");
  const end = normalized.indexOf("\n\n", start);
  if (end < 0 || end - start > 1000) throw new Error("Queue paragraph boundary is ambiguous; existing text retained");
  return normalized.slice(0, start) + replacement.trimEnd() + "\n\n" + normalized.slice(end + 2);
}
