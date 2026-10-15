import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "../../utils/cn";

export type ButtonVariant = "primary" | "secondary" | "link";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  ref?: Ref<HTMLButtonElement>;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const buttonVariantClassName: Record<ButtonVariant, string> = {
  primary:
    "rounded-lg bg-primary font-semibold text-primary-foreground hover:bg-primary-light active:bg-primary-dark shadow-xs",
  secondary:
    "rounded-lg border border-border bg-transparent font-medium text-text-secondary hover:border-text-muted hover:text-text-primary active:bg-surface-alt",
  link: "text-sm font-medium text-primary-light hover:text-primary-foreground",
};

const buttonSizeClassName: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs font-medium",
  md: "h-10 px-4 text-sm font-medium",
  lg: "h-11 px-6 text-base font-medium",
};

/**
 * Generic button primitive using semantic design tokens.
 * By default, primary and secondary variants apply balanced standard sizing
 * (h-10 px-4 text-sm) while allowing consumers to override with size prop or className.
 * The link variant keeps native button semantics without layout padding.
 */
export const Button = ({
  ref,
  variant = "primary",
  size,
  className,
  ...props
}: ButtonProps) => {
  const resolvedSize = size ?? (variant === "link" ? undefined : "md");

  return (
    <button
      ref={ref}
      {...props}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        resolvedSize ? buttonSizeClassName[resolvedSize] : undefined,
        buttonVariantClassName[variant],
        className,
      )}
    />
  );
};
