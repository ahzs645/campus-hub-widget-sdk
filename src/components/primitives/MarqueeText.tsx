import { useState, useEffect, useRef, CSSProperties } from 'react';

interface MarqueeTextProps {
  /** Text to display (scrolls if it overflows) */
  text: string;
  /** Scroll speed in pixels per second. Default: 40 */
  speed?: number;
  /** Separator between repeated text. Default: '•' */
  separator?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Inline marquee for text that overflows its container.
 * Measures the text; if it fits, renders normally. If it overflows,
 * duplicates the text and scrolls it with a CSS animation.
 *
 * Requires the `animate-marquee` CSS animation to be defined globally.
 */
export default function MarqueeText({
  text,
  speed = 40,
  separator = '\u2022',
  className = '',
  style,
}: MarqueeTextProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [duration, setDuration] = useState(10);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const check = () => {
      const ow = outer.clientWidth;
      const iw = inner.scrollWidth;
      const doesOverflow = iw > ow + 2; // 2px tolerance
      setOverflows(doesOverflow);
      if (doesOverflow) {
        setDuration(iw / speed);
      }
    };

    check();
    const ro = new ResizeObserver(check);
    ro.observe(outer);
    return () => ro.disconnect();
  }, [text, speed]);

  if (!overflows) {
    return (
      <div ref={outerRef} className={`overflow-hidden whitespace-nowrap ${className}`} style={style}>
        <span ref={innerRef}>{text}</span>
      </div>
    );
  }

  return (
    <div ref={outerRef} className={`overflow-hidden whitespace-nowrap ${className}`} style={style}>
      <span
        ref={innerRef}
        className="inline-block animate-marquee"
        style={{ animationDuration: `${duration}s` }}
      >
        <span>{text}</span>
        <span className="mx-8 opacity-30">{separator}</span>
        <span>{text}</span>
        <span className="mx-8 opacity-30">{separator}</span>
      </span>
    </div>
  );
}
