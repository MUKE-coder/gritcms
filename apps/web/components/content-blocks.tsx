import type {
  ContentBlock,
  HeadingBlock,
  ParagraphBlock,
  ImageBlock,
  VideoBlock,
  CodeBlock,
  QuoteBlock,
  ListBlock,
  ButtonBlock,
  EmbedBlock,
  ColumnsBlock,
  CTABlock,
  FAQBlock,
  TestimonialBlock,
} from "@repo/shared/types";

function HeadingRenderer({ block }: { block: HeadingBlock }) {
  const sizes: Record<number, string> = {
    1: "text-4xl font-bold",
    2: "text-3xl font-bold",
    3: "text-2xl font-semibold",
    4: "text-xl font-semibold",
    5: "text-lg font-medium",
    6: "text-base font-medium",
  };
  const align = block.data.alignment === "center" ? "text-center" : block.data.alignment === "right" ? "text-right" : "";
  const cls = `${sizes[block.data.level]} tracking-tight ${align}`;
  const level = block.data.level;
  if (level === 1) return <h1 className={cls}>{block.data.text}</h1>;
  if (level === 2) return <h2 className={cls}>{block.data.text}</h2>;
  if (level === 3) return <h3 className={cls}>{block.data.text}</h3>;
  if (level === 4) return <h4 className={cls}>{block.data.text}</h4>;
  if (level === 5) return <h5 className={cls}>{block.data.text}</h5>;
  return <h6 className={cls}>{block.data.text}</h6>;
}

function ParagraphRenderer({ block }: { block: ParagraphBlock }) {
  const align = block.data.alignment === "center" ? "text-center" : block.data.alignment === "right" ? "text-right" : "";
  return (
    <div
      className={`text-text-secondary leading-relaxed ${align}`}
      dangerouslySetInnerHTML={{ __html: block.data.text }}
    />
  );
}

function ImageRenderer({ block }: { block: ImageBlock }) {
  const widthCls = block.data.alignment === "full" ? "w-full" : "max-w-2xl";
  const alignCls =
    block.data.alignment === "center" ? "mx-auto" :
    block.data.alignment === "right" ? "ml-auto" : "";
  return (
    <figure className={`${widthCls} ${alignCls}`}>
      <img
        src={block.data.url}
        alt={block.data.alt}
        width={block.data.width}
        height={block.data.height}
        className="rounded-xl border border-border w-full h-auto"
        loading="lazy"
      />
      {block.data.caption && (
        <figcaption className="mt-2 text-center text-sm text-text-muted">{block.data.caption}</figcaption>
      )}
    </figure>
  );
}

function VideoRenderer({ block }: { block: VideoBlock }) {
  const getEmbedUrl = (url: string) => {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return url;
  };
  return (
    <figure>
      <div className="relative aspect-video rounded-xl overflow-hidden border border-border">
        <iframe
          src={getEmbedUrl(block.data.url)}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      {block.data.caption && (
        <figcaption className="mt-2 text-center text-sm text-text-muted">{block.data.caption}</figcaption>
      )}
    </figure>
  );
}

function CodeRenderer({ block }: { block: CodeBlock }) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
      {block.data.language && (
        <div className="border-b border-border px-4 py-2">
          <span className="text-xs text-text-muted font-mono">{block.data.language}</span>
        </div>
      )}
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm font-mono text-foreground">{block.data.code}</code>
      </pre>
    </div>
  );
}

function QuoteRenderer({ block }: { block: QuoteBlock }) {
  return (
    <blockquote className="border-l-4 border-accent pl-6 py-2">
      <p className="text-lg text-foreground italic leading-relaxed">{block.data.text}</p>
      {block.data.attribution && (
        <cite className="mt-3 block text-sm text-text-muted not-italic">— {block.data.attribution}</cite>
      )}
    </blockquote>
  );
}

function ListRenderer({ block }: { block: ListBlock }) {
  const Tag = block.data.style === "ordered" ? "ol" : "ul";
  const listCls = block.data.style === "ordered" ? "list-decimal" : "list-disc";
  return (
    <Tag className={`${listCls} pl-6 space-y-1.5 text-text-secondary`}>
      {block.data.items.map((item, i) => (
        <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
      ))}
    </Tag>
  );
}

function DividerRenderer() {
  return <hr className="border-border my-2" />;
}

function ButtonRenderer({ block }: { block: ButtonBlock }) {
  const styles: Record<string, string> = {
    primary: "bg-accent text-white hover:bg-accent/90",
    secondary: "bg-bg-secondary text-foreground border border-border hover:bg-bg-hover",
    outline: "border border-accent text-accent hover:bg-accent/10",
  };
  const align = block.data.alignment === "center" ? "text-center" : block.data.alignment === "right" ? "text-right" : "";
  return (
    <div className={align}>
      <a
        href={block.data.url}
        target={block.data.openInNewTab ? "_blank" : undefined}
        rel={block.data.openInNewTab ? "noopener noreferrer" : undefined}
        className={`inline-flex items-center rounded-lg px-6 py-3 text-sm font-medium transition-colors ${styles[block.data.style || "primary"]}`}
      >
        {block.data.text}
      </a>
    </div>
  );
}

function EmbedRenderer({ block }: { block: EmbedBlock }) {
  return (
    <figure>
      <div
        className="rounded-xl overflow-hidden border border-border"
        dangerouslySetInnerHTML={{ __html: block.data.html }}
      />
      {block.data.caption && (
        <figcaption className="mt-2 text-center text-sm text-text-muted">{block.data.caption}</figcaption>
      )}
    </figure>
  );
}

function ColumnsRenderer({ block }: { block: ColumnsBlock }) {
  const cols = block.data.columns.length;
  const gridCls = cols === 2 ? "md:grid-cols-2" : "md:grid-cols-3";
  return (
    <div className={`grid gap-6 ${gridCls}`}>
      {block.data.columns.map((column, i) => (
        <div key={i} className="space-y-6">
          <ContentBlockList blocks={column} />
        </div>
      ))}
    </div>
  );
}

function CTARenderer({ block }: { block: CTABlock }) {
  const styles: Record<string, string> = {
    highlight: "bg-accent/10 border-accent/30",
    minimal: "bg-transparent border-border",
    default: "bg-bg-secondary border-border",
  };
  return (
    <div className={`rounded-xl border p-8 text-center ${styles[block.data.style || "default"]}`}>
      <h3 className="text-2xl font-bold text-foreground">{block.data.heading}</h3>
      <p className="mt-3 text-text-secondary max-w-lg mx-auto">{block.data.text}</p>
      <a
        href={block.data.buttonUrl}
        className="mt-6 inline-flex items-center rounded-lg bg-accent px-6 py-3 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
      >
        {block.data.buttonText}
      </a>
    </div>
  );
}

function FAQRenderer({ block }: { block: FAQBlock }) {
  return (
    <div className="space-y-4">
      {block.data.items.map((item, i) => (
        <details key={i} className="group rounded-xl border border-border bg-bg-secondary">
          <summary className="flex cursor-pointer items-center justify-between px-6 py-4 font-medium text-foreground">
            {item.question}
            <span className="ml-4 text-text-muted group-open:rotate-180 transition-transform">&#9660;</span>
          </summary>
          <div className="px-6 pb-4 text-text-secondary leading-relaxed">{item.answer}</div>
        </details>
      ))}
    </div>
  );
}

function TestimonialRenderer({ block }: { block: TestimonialBlock }) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-6">
      <p className="text-foreground italic leading-relaxed">&ldquo;{block.data.quote}&rdquo;</p>
      <div className="mt-4 flex items-center gap-3">
        {block.data.avatar && (
          <img src={block.data.avatar} alt={block.data.name} className="h-10 w-10 rounded-full object-cover" />
        )}
        <div>
          <p className="text-sm font-medium text-foreground">{block.data.name}</p>
          {block.data.role && <p className="text-xs text-text-muted">{block.data.role}</p>}
        </div>
      </div>
    </div>
  );
}

function BlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "heading":    return <HeadingRenderer block={block} />;
    case "paragraph":  return <ParagraphRenderer block={block} />;
    case "image":      return <ImageRenderer block={block} />;
    case "video":      return <VideoRenderer block={block} />;
    case "code":       return <CodeRenderer block={block} />;
    case "quote":      return <QuoteRenderer block={block} />;
    case "list":       return <ListRenderer block={block} />;
    case "divider":    return <DividerRenderer />;
    case "button":     return <ButtonRenderer block={block} />;
    case "embed":      return <EmbedRenderer block={block} />;
    case "columns":    return <ColumnsRenderer block={block} />;
    case "cta":        return <CTARenderer block={block} />;
    case "faq":        return <FAQRenderer block={block} />;
    case "testimonial": return <TestimonialRenderer block={block} />;
    default:           return null;
  }
}

export function ContentBlockList({ blocks }: { blocks: ContentBlock[] | null | undefined }) {
  if (!blocks || blocks.length === 0) return null;
  return (
    <>
      {blocks.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </>
  );
}
