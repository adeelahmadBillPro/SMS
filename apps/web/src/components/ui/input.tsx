import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm",
        "placeholder:text-slate-400",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-colors duration-100",
        error
          ? "border-rose-500 focus-visible:ring-rose-500"
          : "border-slate-200 hover:border-slate-300",
        className,
      )}
      {...props}
    />
  );
});
