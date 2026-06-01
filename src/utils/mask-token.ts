export function maskToken(token: string) {
  const trimmed = token.trim();

  if (trimmed.length <= 8) {
    return "****";
  }

  return `${trimmed.slice(0, 4)}**********${trimmed.slice(-4)}`;
}
