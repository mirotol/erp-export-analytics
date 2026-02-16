import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
  isLoading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "rounded-lg font-medium transition-all focus:ring-2 focus:ring-accent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors";

  const sizes = {
    sm: "px-3 py-1.5 text-base",
    md: "px-4 py-2 text-lg",
  };

  const variants = {
    primary:
      "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)]",
    secondary:
      "bg-transparent text-[var(--text-primary)] border border-[var(--white-12)] hover:bg-[var(--white-05)]",
  };

  return (
    <button
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="animate-spin h-5 w-5 text-current" />}
      {children}
    </button>
  );
}
