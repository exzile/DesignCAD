import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import './SlicerSection.css';

export function SlicerSection({
  title,
  icon,
  color,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon?: ReactNode;
  color?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="slicer-section"
      style={color ? { '--sc': color } as CSSProperties : undefined}
    >
      <div className="slicer-section__header" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {icon}
        {title}
      </div>
      {open && <div className="slicer-section__body">{children}</div>}
    </div>
  );
}
