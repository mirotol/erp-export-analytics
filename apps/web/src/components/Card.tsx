interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-surface border border-border rounded-xl p-6 ${className}`}>{children}</div>
  );
}
