"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui";

// Botón de envío que pide confirmación antes de ejecutar acciones destructivas.
export function ConfirmButton({
  message,
  onClick,
  ...props
}: { message: string } & ComponentProps<typeof Button>) {
  return (
    <Button
      type="submit"
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
        onClick?.(event);
      }}
      {...props}
    />
  );
}
