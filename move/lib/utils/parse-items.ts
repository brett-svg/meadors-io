export function parseBulkItems(input: string) {
  return input
    .split(/\n|,/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((line) => {
      const xPattern = line.match(/^(.*?)\s*x\s*(\d+)$/i);
      if (xPattern) return { name: xPattern[1].trim(), qty: Number(xPattern[2]) };
      const parenPattern = line.match(/^(.*?)\s*\((\d+)\)$/);
      if (parenPattern) return { name: parenPattern[1].trim(), qty: Number(parenPattern[2]) };
      return { name: line, qty: 1 };
    });
}
