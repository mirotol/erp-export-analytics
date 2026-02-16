interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 shadow-[var(--shadow-subtle)] ${className}`}
    >
      {children}
    </div>
  );
}
