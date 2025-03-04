import React, { useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from './providers/themeProvider';


interface MarkdownMessagesProps {
  messages: string[];
}

const MarkdownMessages: React.FC<MarkdownMessagesProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme()

  const components: any = {
    h1: ({ children }: any) => (
      <h1 className="text-2xl font-bold mt-4 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        {children}
      </h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-xl font-bold mt-4 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
        {children}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-lg font-bold mt-4 mb-3">
        {children}
      </h3>
    ),
    h4: ({ children }: any) => (
      <h4 className="text-base font-bold mt-4 mb-2">
        {children}
      </h4>
    ),
    p: ({ children }: any) => (
      <p className="mb-4 leading-relaxed">
        {children}
      </p>
    ),
    ul: ({ children }: any) => (
      <ul className="list-disc pl-6 mb-4">
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal pl-6 mb-4">
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li className="mb-1">
        {children}
      </li>
    ),
    // @ts-ignore
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');

      if (!inline && match) {
        return (
          <SyntaxHighlighter
            style={theme === "dark" ? vscDarkPlus : vs}
            language={match[1]}
            PreTag="div"
            customStyle={{
              margin: '1rem 0',
              borderRadius: '0.3rem',
              padding: '1rem'
            }}
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        );
      }

      return (
        <code className="px-1.5 py-0.5 rounded-md bg-card text-sm font-mono inline" {...props}>
          {children}
        </code>
      );
    },
    blockquote: ({ children }: any) => (
      <blockquote className="pl-4 border-l-4 border-gray-200 dark:border-gray-700 italic mb-4">
        {children}
      </blockquote>
    ),
    a: ({ href, children }: any) => (
      <a
        href={href}
        className="text-blue-600 dark:text-blue-400 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    table: ({ children }: any) => (
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full border border-gray-200 dark:border-gray-700">
          {children}
        </table>
      </div>
    ),
    th: ({ children }: any) => (
      <th className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="px-4 py-2 border border-gray-200 dark:border-gray-700">
        {children}
      </td>
    ),
    hr: () => (
      <hr className="my-6 border-t border-gray-200 dark:border-gray-700" />
    ),
    img: ({ src, alt }: any) => (
      <img
        src={src}
        alt={alt}
        className="max-w-full h-auto rounded-lg my-4"
      />
    ),
  };

  return (
    <div className="space-y-4 overflow-y-auto">
      {messages.map((msg, i) => (
        <div
          key={i}
          className="px-4 rounded-lg bg-muted"
        >
          <div className="prose dark:prose-invert prose-sm max-w-none overflow-hidden">
            <ReactMarkdown
              className="markdown-body pt-3"
              components={components}
            >
              {msg}
            </ReactMarkdown>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MarkdownMessages;
