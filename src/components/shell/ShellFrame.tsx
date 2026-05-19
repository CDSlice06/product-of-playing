interface ShellFrameProps {
  src: string;
  title: string;
  onLoad: () => void;
}

export default function ShellFrame({ src, title, onLoad }: ShellFrameProps) {
  return (
    <iframe
      key={src}
      title={title}
      src={src}
      onLoad={onLoad}
      loading="eager"
      referrerPolicy="strict-origin-when-cross-origin"
      allow="fullscreen; autoplay; clipboard-read; clipboard-write"
      className="shell-frame"
    />
  );
}
