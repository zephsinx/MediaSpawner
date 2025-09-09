import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-[rgb(var(--color-accent))] text-[rgb(var(--color-accent-foreground))] hover:bg-[rgb(var(--color-accent-hover))]",
        secondary:
          "bg-[rgb(var(--color-muted))] text-[rgb(var(--color-fg))] hover:bg-[rgb(var(--color-muted))]/80",
        outline:
          "border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-fg))] hover:bg-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-fg))]",
        ghost:
          "text-[rgb(var(--color-fg))] hover:bg-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-fg))]",
        destructive:
          "bg-[rgb(var(--color-error))] text-[rgb(var(--color-error-foreground))] hover:bg-[rgb(var(--color-error-hover))]",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4 py-2",
        lg: "h-10 px-5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export const inputVariants = cva(
  "flex w-full rounded-md border px-3 py-2 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[rgb(var(--color-muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-[rgb(var(--color-input-border))] bg-[rgb(var(--color-input))] text-[rgb(var(--color-fg))] focus-visible:border-[rgb(var(--color-accent))]",
        error:
          "border-[rgb(var(--color-error))] bg-[rgb(var(--color-error-bg))] text-[rgb(var(--color-fg))] focus-visible:border-[rgb(var(--color-error))] focus-visible:ring-[rgb(var(--color-error))]",
        disabled:
          "border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))] cursor-not-allowed",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export const cardVariants = cva(
  "rounded-lg border bg-[rgb(var(--color-bg))] text-[rgb(var(--color-fg))] shadow-sm transition-colors",
  {
    variants: {
      variant: {
        default: "border-[rgb(var(--color-border))]",
        selected:
          "border-[rgb(var(--color-accent))] bg-[rgb(var(--color-accent))]/5",
        hover:
          "border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-accent))] hover:shadow-md cursor-pointer",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export const cardHeaderVariants = cva("flex flex-col space-y-1.5 p-6");
export const cardTitleVariants = cva(
  "text-2xl font-semibold leading-none tracking-tight"
);
export const cardDescriptionVariants = cva(
  "text-sm text-[rgb(var(--color-muted-foreground))]"
);
export const cardContentVariants = cva("p-6 pt-0");
export const cardFooterVariants = cva("flex items-center p-6 pt-0");
