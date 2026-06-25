"use client";

import { useFormStatus } from "react-dom";

type FormSubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
  confirmMessage?: string;
};

export function FormSubmitButton({
  children,
  pendingLabel = "Working...",
  className = "btn-primary w-full",
  disabled = false,
  confirmMessage,
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className={className}
      disabled={disabled || pending}
      onClick={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
