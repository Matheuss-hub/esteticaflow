"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | "href"> & LinkProps & {
  disabled?: boolean;
  children: ReactNode;
};

export function AccessLink({ disabled = false, onClick, title, children, ...props }: Props) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  return (
    <Link
      {...props}
      onClick={handleClick}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : props.tabIndex}
      title={disabled ? "Disponível ao ativar o plano" : title}
      className={`${props.className ?? ""}${disabled ? " cursor-not-allowed opacity-50" : ""}`}
    >
      {children}
    </Link>
  );
}
