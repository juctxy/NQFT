import type { CSSProperties } from 'react';

/**
 * Hiển thị icon Ionicons (cùng bộ icon với app NQFT) với màu tùy ý.
 * `src` là data-URL SVG từ 'ionicons/icons'; dùng làm mask để tô màu bằng background-color.
 */
export function Icon({ src, size, color }: { src: string; size: number; color: string }) {
  const style: CSSProperties = {
    width: size,
    height: size,
    backgroundColor: color,
    maskImage: `url("${src}")`,
    WebkitMaskImage: `url("${src}")`,
  };
  return <span className="icon" style={style} aria-hidden="true" />;
}
