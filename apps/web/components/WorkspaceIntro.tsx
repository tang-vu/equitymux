import type { ReactNode } from "react";

export function WorkspaceIntro({
  index,
  title,
  description,
  children,
}: {
  index: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="workspace-intro">
      <div>
        <p className="label">EQUITYMUX / {index}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
      <svg viewBox="0 0 180 80" aria-hidden="true">
        <path
          d="M0 15h60l40 25h80M0 40h180M0 65h60l40-25M60 0v80M100 0v80M140 0v80"
          fill="none"
          stroke="currentColor"
        />
      </svg>
    </header>
  );
}
