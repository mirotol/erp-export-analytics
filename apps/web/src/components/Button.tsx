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
    "rounded-lg font-medium transition-all focus:ring-2 focus:ring-accent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";

  const sizes = {
    sm: "px-3 py-1.5 text-base",
    md: "px-4 py-2 text-lg",
  };

  const variants = {
    primary: "bg-accent text-accent-foreground hover:opacity-90",
    secondary: "bg-surface-hover text-foreground hover:bg-border border border-border",
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
