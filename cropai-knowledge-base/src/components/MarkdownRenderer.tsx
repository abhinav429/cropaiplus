import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

/**
 * Strip a leading YAML frontmatter block (`---\n...\n---\n?`) before
 * rendering so users never see raw YAML in the browser. We intentionally
 * don't import `parseFrontmatter` from `lib/wiki` — this component runs
 * inside React server/client boundaries and we want zero coupling to the
 * parser.
 */
function stripFrontmatter(content: string): string {
  return content.replace(/^---\n[\s\S]*?\n---\n?\n?/, "");
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const body = stripFrontmatter(content);
  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => {
            // Rewrite internal .md links to /wiki/ routes using Next.js Link
            if (href && href.endsWith(".md") && !href.startsWith("http")) {
              const slug = href.replace(/\.md$/, "");
              return (
                <Link href={`/wiki/${slug}`} {...props}>
                  {children}
                </Link>
              );
            }
            // External links: open in new tab
            const isExternal =
              href &&
              (href.startsWith("http://") || href.startsWith("https://"));
            return (
              <a
                href={href}
                {...(isExternal
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                {...props}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
