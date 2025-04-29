import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600",
          "bg-gray-50 dark:bg-gray-700",
          "text-gray-900 dark:text-white",
          "px-4 py-2",
          "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          "hover:border-blue-300 dark:hover:border-blue-500",
          "transition-colors duration-200",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600",
          "bg-gray-50 dark:bg-gray-700",
          "text-gray-900 dark:text-white",
          "px-4 py-2",
          "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          "hover:border-blue-300 dark:hover:border-blue-500",
          "transition-colors duration-200",
          "resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
TextArea.displayName = "TextArea"

export { Input, TextArea }
