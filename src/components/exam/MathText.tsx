import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import DOMPurify from "dompurify";

interface MathTextProps {
  text: string;
  className?: string;
}

/**
 * Renders text with inline math ($...$) and block math ($$...$$) using KaTeX.
 * Also auto-detects Arabic text and applies RTL direction.
 * Output is sanitized with DOMPurify to prevent XSS.
 */
const MathText = ({ text, className = "" }: MathTextProps) => {
  const rendered = useMemo(() => {
    if (!text) return "";

    // Split by $$...$$ (block) and $...$ (inline)
    // Process block math first ($$...$$)
    const blockRegex = /\$\$([\s\S]*?)\$\$/g;

    // First pass: extract block math
    const withoutBlock = text.replace(blockRegex, (_fullMatch, formula) => {
      return `%%BLOCK_MATH%%${formula}%%END_BLOCK%%`;
    });

    // Second pass: extract inline math
    const withoutInline = withoutBlock.replace(/\$([^$\n]+?)\$/g, (_fullMatch, formula) => {
      return `%%INLINE_MATH%%${formula}%%END_INLINE%%`;
    });

    // Now split and render
    const segments = withoutInline.split(/(%%BLOCK_MATH%%[\s\S]*?%%END_BLOCK%%|%%INLINE_MATH%%[\s\S]*?%%END_INLINE%%)/);

    const rawHtml = segments
      .map((segment) => {
        const blockMatch = segment.match(/%%BLOCK_MATH%%([\s\S]*?)%%END_BLOCK%%/);
        if (blockMatch) {
          try {
            return `<div class="my-2 text-center">${katex.renderToString(blockMatch[1].trim(), { displayMode: true, throwOnError: false })}</div>`;
          } catch {
            return `<div class="my-2 text-center text-destructive">${DOMPurify.sanitize(blockMatch[1])}</div>`;
          }
        }

        const inlineMatch = segment.match(/%%INLINE_MATH%%([\s\S]*?)%%END_INLINE%%/);
        if (inlineMatch) {
          try {
            return katex.renderToString(inlineMatch[1].trim(), { displayMode: false, throwOnError: false });
          } catch {
            return `<span class="text-destructive">${DOMPurify.sanitize(inlineMatch[1])}</span>`;
          }
        }

        // Regular text - check for Arabic characters for RTL
        const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(segment);
        if (hasArabic) {
          return `<span dir="rtl" class="inline-block text-right font-arabic">${DOMPurify.sanitize(segment)}</span>`;
        }

        return DOMPurify.sanitize(segment);
      })
      .join("");

    // Final sanitization pass allowing KaTeX-generated elements
    return DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: ['semantics', 'annotation', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'mover', 'munder', 'msqrt', 'mroot', 'mtable', 'mtr', 'mtd', 'mtext', 'mspace', 'mpadded', 'menclose', 'math', 'mstyle', 'mglyph', 'maligngroup', 'malignmark'],
      ADD_ATTR: ['xmlns', 'mathvariant', 'encoding', 'displaystyle', 'scriptlevel', 'fence', 'stretchy', 'symmetric', 'maxsize', 'minsize', 'largeop', 'movablelimits', 'accent', 'accentunder', 'lspace', 'rspace', 'linethickness', 'columnalign', 'rowalign', 'columnspacing', 'rowspacing', 'columnlines', 'rowlines', 'frame', 'framespacing', 'equalrows', 'equalcolumns', 'side', 'width', 'height', 'depth', 'voffset', 'dir', 'class', 'style', 'aria-hidden', 'focusable', 'role'],
      ALLOW_DATA_ATTR: false,
    });
  }, [text]);

  return (
    <div
      className={`math-text ${className}`}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
};

export default MathText;
