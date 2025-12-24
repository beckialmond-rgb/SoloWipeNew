import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] relative overflow-hidden will-change-transform",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-primary via-primary to-primary/95 text-primary-foreground hover:from-primary/95 hover:via-primary hover:to-primary shadow-depth-2 hover:shadow-depth-3 hover:-translate-y-1 hover:scale-[1.02] focus-premium btn-premium",
        destructive: "bg-gradient-to-r from-destructive via-destructive to-destructive/95 text-destructive-foreground hover:from-destructive/95 hover:via-destructive hover:to-destructive shadow-depth-2 hover:shadow-depth-3 hover:-translate-y-1 hover:scale-[1.02]",
        outline: "border-2 border-input bg-background hover:bg-muted/80 hover:text-foreground hover:border-primary/60 hover:shadow-depth-2 hover:-translate-y-1 hover:scale-[1.02]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 hover:shadow-depth-2 hover:-translate-y-1 hover:scale-[1.02]",
        ghost: "hover:bg-muted/80 hover:text-foreground hover:shadow-sm hover:-translate-y-0.5",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/90 transition-all",
        success: "bg-gradient-to-r from-success via-success to-success/95 text-success-foreground hover:from-success/95 hover:via-success hover:to-success shadow-depth-2 hover:shadow-depth-3 hover:-translate-y-1 hover:scale-[1.02]",
        warning: "bg-warning/10 text-warning border-2 border-warning/30 hover:bg-warning/20 hover:border-warning/40 hover:shadow-depth-2 hover:-translate-y-1",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-10 rounded-lg px-3",
        lg: "h-12 rounded-lg px-6",
        xl: "h-14 rounded-xl px-8 text-base",
        icon: "h-11 w-11",
        fat: "min-h-[60px] px-6 rounded-xl text-base font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
