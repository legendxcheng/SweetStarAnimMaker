export type ButtonVariant = "primary" | "secondary" | "success" | "warning" | "danger";
export type ButtonSize = "default" | "compact";

const BUTTON_BASE_CLASS_NAME =
  "rounded-lg text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed";

const BUTTON_SIZE_CLASS_NAMES: Record<ButtonSize, string> = {
  default: "px-4 py-2",
  compact: "px-3 py-1.5",
};

const BUTTON_VARIANT_CLASS_NAMES: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-(--color-accent) to-(--color-accent-end) text-(--color-bg-base) hover:opacity-90 transition-opacity",
  secondary:
    "bg-gradient-to-r from-(--color-bg-elevated) to-(--color-border) text-(--color-text-primary) border border-(--color-border-muted) hover:opacity-90 transition-opacity",
  success:
    "bg-gradient-to-r from-(--color-success) to-(--color-success-end) text-(--color-bg-base) hover:opacity-90 transition-opacity",
  warning:
    "bg-gradient-to-r from-(--color-warning) to-(--color-warning-end) text-(--color-bg-base) hover:opacity-90 transition-opacity",
  danger:
    "bg-gradient-to-r from-(--color-danger) to-(--color-danger-end) text-(--color-bg-base) hover:opacity-90 transition-opacity",
};

interface ButtonClassNameOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function getButtonClassName(options: ButtonClassNameOptions = {}) {
  const { variant = "primary", size = "default" } = options;

  return [
    BUTTON_BASE_CLASS_NAME,
    BUTTON_SIZE_CLASS_NAMES[size],
    BUTTON_VARIANT_CLASS_NAMES[variant],
  ].join(" ");
}
