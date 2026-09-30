function inline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${keyPrefix}-${i}`} className="font-semibold text-fg">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>;
  });
}

export function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="mesh-copy space-y-2 leading-relaxed text-fg/95">
      {lines.map((line, index) => {
        if (!line.trim()) return <div key={index} className="h-1" />;
        const numbered = line.match(/^(\d+)\.\s+(.*)$/);
        if (numbered) {
          return (
            <p key={index}>
              <span className="text-muted">{numbered[1]}. </span>
              {inline(numbered[2], `${index}`)}
            </p>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <p key={index} className="pl-1">
              <span className="text-muted">– </span>
              {inline(line.slice(2), `${index}`)}
            </p>
          );
        }
        return <p key={index}>{inline(line, `${index}`)}</p>;
      })}
    </div>
  );
}
