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
  style,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "rounded-lg font-medium transition-all focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none active:ring-2 active:ring-accent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors";

  const sizes = {
    sm: "px-3 py-1.5 text-base",
    md: "px-4 py-2 text-lg",
  };

  const variants = {
    primary:
      "text-white transition-all duration-150 ease-out " +
      "opacity-90 hover:opacity-100 shadow-lg " +
      "active:opacity-90 active:translate-y-[1px] " +
      "disabled:opacity-40 disabled:cursor-not-allowed " +
      "hover:shadow-[var(--accent-glow)]",
    secondary:
      "bg-transparent text-[var(--text-primary)] border border-[var(--border-bold)] hover:bg-[var(--bg-hover)] shadow-md",
  };

  return (
    <button
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      style={{
        ...(variant === "primary"
          ? {
              backgroundColor: "var(--accent)",
              backgroundImage: "var(--accent-gradient)",
            }
          : {}),
        ...style,
      }}
      {...props}
    >
      {isLoading && <Loader2 className="animate-spin h-5 w-5 text-current" />}
      {children}
    </button>
  );
}
