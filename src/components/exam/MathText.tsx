import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathTextProps {
  text: string;
  className?: string;
}

/**
 * Renders text with inline math ($...$) and block math ($$...$$) using KaTeX.
 * Also auto-detects Arabic text and applies RTL direction.
 */
const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const MathText = ({ text, className = "" }: MathTextProps) => {
  const rendered = useMemo(() => {
    if (!text) return "";

    // Split by $$...$$ (block) and $...$ (inline)
    const parts: string[] = [];
    let remaining = text;

    // Process block math first ($$...$$)
    const blockRegex = /\$\$([\s\S]*?)\$\$/g;
    let lastIndex = 0;
    let match;

    const tempParts: { type: "text" | "block" | "inline"; content: string }[] = [];

    // First pass: extract block math
    const withoutBlock = remaining.replace(blockRegex, (fullMatch, formula) => {
      return `%%BLOCK_MATH%%${formula}%%END_BLOCK%%`;
    });

    // Second pass: extract inline math
    const withoutInline = withoutBlock.replace(/\$([^$\n]+?)\$/g, (fullMatch, formula) => {
      return `%%INLINE_MATH%%${formula}%%END_INLINE%%`;
    });

    // Now split and render
    const segments = withoutInline.split(/(%%BLOCK_MATH%%[\s\S]*?%%END_BLOCK%%|%%INLINE_MATH%%[\s\S]*?%%END_INLINE%%)/);

    return segments
      .map((segment) => {
        const blockMatch = segment.match(/%%BLOCK_MATH%%([\s\S]*?)%%END_BLOCK%%/);
        if (blockMatch) {
          try {
            return `<div class="my-2 text-center">${katex.renderToString(blockMatch[1].trim(), { displayMode: true, throwOnError: false })}</div>`;
          } catch {
            return `<div class="my-2 text-center text-destructive">${blockMatch[1]}</div>`;
          }
        }

        const inlineMatch = segment.match(/%%INLINE_MATH%%([\s\S]*?)%%END_INLINE%%/);
        if (inlineMatch) {
          try {
            return katex.renderToString(inlineMatch[1].trim(), { displayMode: false, throwOnError: false });
          } catch {
            return `<span class="text-destructive">${inlineMatch[1]}</span>`;
          }
        }

        // Regular text - escape HTML to prevent XSS, then check for Arabic characters for RTL
        const escaped = escapeHtml(segment);
        const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(segment);
        if (hasArabic) {
          return `<span dir="rtl" class="inline-block text-right font-arabic">${escaped}</span>`;
        }

        return escaped;
      })
      .join("");
  }, [text]);

  return (
    <div
      className={`math-text ${className}`}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
};

export default MathText;
