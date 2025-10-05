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

export const switchVariants = cva(
  "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--color-bg))] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[rgb(var(--color-accent))] data-[state=unchecked]:bg-[rgb(var(--color-border))]",
  {
    variants: {
      size: {
        sm: "h-5 w-9",
        md: "h-6 w-11",
        lg: "h-7 w-12",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export const switchThumbVariants = cva(
  "pointer-events-none block h-5 w-5 rounded-full bg-[rgb(var(--color-bg))] shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
  {
    variants: {
      size: {
        sm: "h-4 w-4 data-[state=checked]:translate-x-4",
        md: "h-5 w-5 data-[state=checked]:translate-x-5",
        lg: "h-6 w-6 data-[state=checked]:translate-x-6",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export const comboboxVariants = cva(
  "w-full px-3 py-2 border rounded-md bg-[rgb(var(--color-input))] text-[rgb(var(--color-fg))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-[rgb(var(--color-input-border))] focus-visible:border-[rgb(var(--color-accent))]",
        error:
          "border-[rgb(var(--color-error))] bg-[rgb(var(--color-error-bg))] focus-visible:border-[rgb(var(--color-error))] focus-visible:ring-[rgb(var(--color-error))]",
        disabled:
          "border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))] cursor-not-allowed",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);
