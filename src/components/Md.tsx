import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Markdown for posts/comments. Raw HTML is never rendered, images are dropped, links open in a new tab and bare URLs become links. */
export function Md({ text }: { text: string }) {
  return (
    <div className="md break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
        a: ({ node, ...p }: any) => <a {...p} target="_blank" rel="noopener noreferrer nofollow ugc" className="underline" onClick={(e) => e.stopPropagation()} />,
        img: () => null,
      }}>{text}</ReactMarkdown>
    </div>
  );
}
