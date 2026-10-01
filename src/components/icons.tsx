import type { SVGProps } from "react";

// Iconos de trazo fino (sin emojis). Heredan el color del texto.
function Svg(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M4.5 10.5l3.5 3.5 7.5-8" />
  </Svg>
);
export const IconLock = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <rect x="4.5" y="9" width="11" height="7.5" rx="1.5" />
    <path d="M7 9V6.5a3 3 0 016 0V9" />
  </Svg>
);
export const IconText = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M4 5.5h12M4 9.5h12M4 13.5h7" />
  </Svg>
);
export const IconVideo = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <rect x="3" y="4.5" width="14" height="11" rx="2" />
    <path d="M8.5 7.5v5l4-2.5-4-2.5z" fill="currentColor" stroke="none" />
  </Svg>
);
export const IconImage = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <rect x="3" y="4" width="14" height="12" rx="2" />
    <circle cx="7.5" cy="8.5" r="1.3" />
    <path d="M3.5 14l4-3.5 3 2.5 2.5-2 3.5 3" />
  </Svg>
);
export const IconLink = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M8.5 11.5a3 3 0 004.2 0l2.3-2.3a3 3 0 00-4.2-4.2l-.8.8" />
    <path d="M11.5 8.5a3 3 0 00-4.2 0L5 10.8a3 3 0 004.2 4.2l.8-.8" />
  </Svg>
);
export const IconFile = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M6 3h5.5L15 6.5V16a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" />
    <path d="M11 3v4h4" />
  </Svg>
);
export const IconQuiz = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <rect x="4" y="3.5" width="12" height="13" rx="1.5" />
    <path d="M7 8l1 1 2-2M7 13l1 1 2-2M12 8h1.5M12 13h1.5" />
  </Svg>
);
export const IconDownload = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M10 3.5v9M6.5 9.5L10 13l3.5-3.5M4 16h12" />
  </Svg>
);
export const IconArrow = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M4 10h11M11 6l4 4-4 4" />
  </Svg>
);
export const IconExternal = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M8 5H5.5A1.5 1.5 0 004 6.5v8A1.5 1.5 0 005.5 16h8a1.5 1.5 0 001.5-1.5V12M11 4h5v5M16 4l-7 7" />
  </Svg>
);
export const IconUp = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M10 15.5v-11M5.5 9L10 4.5 14.5 9" />
  </Svg>
);
export const IconDown = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M10 4.5v11M5.5 11L10 15.5 14.5 11" />
  </Svg>
);
export const IconShield = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M10 3l6 2.2v4.6c0 3.4-2.4 5.9-6 7.2-3.6-1.3-6-3.8-6-7.2V5.2L10 3z" />
    <path d="M7.5 10l1.8 1.8L13 8" />
  </Svg>
);

// Icono según el tipo de lección.
export function LessonIcon({ type, ...props }: { type?: string } & SVGProps<SVGSVGElement>) {
  switch (type) {
    case "VIDEO_EMBED":
    case "VIDEO_UPLOAD":
      return <IconVideo {...props} />;
    case "IMAGE":
      return <IconImage {...props} />;
    case "LINK":
      return <IconLink {...props} />;
    case "FILE":
      return <IconFile {...props} />;
    default:
      return <IconText {...props} />;
  }
}
