import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathTextProps {
  text: string;
  className?: string;
}

/**
 * Smart MathText Renderer
 * Supports:
 *  - Inline: $...$ or \( ... \)
 *  - Block: $$...$$ or \[ ... \]
 * Auto-normalizes Unicode math symbols (− × ÷).
 */

const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const normalizeLatex = (input: string) => {
  return input
    .replace(/−/g, "-") // Unicode minus → normal minus
    .replace(/×/g, "\\times ")
    .replace(/÷/g, "\\div ")
    .replace(/\u00A0/g, " "); // non-breaking space
};

const MathText = ({ text, className = "" }: MathTextProps) => {
  const rendered = useMemo(() => {
    if (!text) return "";

    // Normalize symbols first
    const normalizedText = normalizeLatex(text);

    // Replace block delimiters \[...\] into $$...$$
    let processed = normalizedText
      .replace(/\\\[(.*?)\\\]/gs, (_, formula) => `$$${formula}$$`)
      .replace(/\\\((.*?)\\\)/gs, (_, formula) => `$${formula}$`);

    // Extract block math first
    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
      try {
        return `%%BLOCK%%${katex.renderToString(formula.trim(), {
          displayMode: true,
          throwOnError: false,
        })}%%END_BLOCK%%`;
      } catch {
        return `%%BLOCK%%<span class="text-red-500">${formula}</span>%%END_BLOCK%%`;
      }
    });

    // Extract inline math
    processed = processed.replace(/\$([^$\n]+?)\$/g, (_, formula) => {
      try {
        return `%%INLINE%%${katex.renderToString(formula.trim(), {
          displayMode: false,
          throwOnError: false,
        })}%%END_INLINE%%`;
      } catch {
        return `%%INLINE%%<span class="text-red-500">${formula}</span>%%END_INLINE%%`;
      }
    });

    // Split into segments and escape normal text
    const segments = processed.split(/(%%BLOCK%%[\s\S]*?%%END_BLOCK%%|%%INLINE%%[\s\S]*?%%END_INLINE%%)/);

    return segments
      .map((segment) => {
        if (segment.startsWith("%%BLOCK%%")) {
          return segment.replace("%%BLOCK%%", "").replace("%%END_BLOCK%%", "");
        }

        if (segment.startsWith("%%INLINE%%")) {
          return segment.replace("%%INLINE%%", "").replace("%%END_INLINE%%", "");
        }

        // Regular text
        const escaped = escapeHtml(segment);

        // Arabic RTL detection
        const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(segment);

        if (hasArabic) {
          return `<span dir="rtl" class="inline-block text-right font-arabic">${escaped}</span>`;
        }

        return escaped;
      })
      .join("");
  }, [text]);

  return <div className={`math-text ${className}`} dangerouslySetInnerHTML={{ __html: rendered }} />;
};

export default MathText;
