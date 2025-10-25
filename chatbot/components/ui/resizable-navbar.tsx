"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export const Navbar = ({
  children,
  className,
  isHomePage = false,
}: {
  children: React.ReactNode;
  className?: string;
  isHomePage?: boolean;
}) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed z-50 transition-all duration-300",
        isHomePage
          ? scrolled
            ? "top-0 left-0 right-0 bg-black/80 backdrop-blur-lg border-b border-neutral-800 shadow-lg"
            : "top-0 left-0 right-0 bg-transparent border-b border-transparent"
          : "top-3 left-3 right-3 bg-black/60 backdrop-blur-xl border border-green-400/20 rounded-xl shadow-2xl shadow-green-400/5",
        className
      )}
    >
      {children}
    </nav>
  );
};

export const NavBody = ({
  children,
  className,
  visible = true,
}: {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}) => {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "hidden lg:flex items-center justify-between px-6 py-4 max-w-7xl mx-auto",
        className
      )}
    >
      {children}
    </div>
  );
};

export const NavItems = ({
  items,
  className,
  onItemClick,
  currentPath,
}: {
  items: Array<{ name: string; link: string }>;
  className?: string;
  onItemClick?: () => void;
  currentPath?: string;
}) => {
  return (
    <div className={cn("flex items-center gap-8", className)}>
      {items.map((item, idx) => {
        const isActive = currentPath === item.link;
        return (
          <Link
            key={`nav-item-${idx}`}
            href={item.link}
            onClick={onItemClick}
            className={cn(
              "relative transition-colors duration-200 group text-lg font-medium",
              isActive ? "text-green-400" : "text-neutral-300 hover:text-white"
            )}
          >
            {item.name}
            <span
              className={cn(
                "absolute -bottom-1 left-0 h-0.5 bg-green-400 transition-all duration-300",
                isActive ? "w-full" : "w-0 group-hover:w-full"
              )}
            ></span>
          </Link>
        );
      })}
    </div>
  );
};

export const MobileNav = ({
  children,
  className,
  visible = true,
}: {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}) => {
  if (!visible) return null;

  return (
    <div className={cn("lg:hidden px-6 py-4", className)}>
      {children}
    </div>
  );
};

export const NavbarLogo = ({ className }: { className?: string }) => {
  return (
    <Link
      href="/"
      className={cn(
        "text-3xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-3",
        className
      )}
    >
      <img src="/compass_DAO.png" alt="CompassDAO" className="w-14 h-14" />
      CompassDAO
    </Link>
  );
};

export const NavbarButton = ({
  href,
  as = "button",
  children,
  className,
  variant = "primary",
  onClick,
  ...props
}: {
  href?: string;
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "dark" | "gradient";
  onClick?: () => void;
  [key: string]: any;
}) => {
  const Component = href ? Link : as;

  const variantStyles = {
    primary: "bg-green-500 text-black hover:bg-green-400 hover:scale-105 active:scale-95",
    secondary: "bg-transparent border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-black hover:scale-105 active:scale-95",
    dark: "bg-neutral-900 text-white hover:bg-neutral-800 hover:scale-105 active:scale-95",
    gradient: "bg-gradient-to-r from-green-400 to-blue-500 text-black hover:from-green-500 hover:to-blue-600 hover:scale-105 active:scale-95"
  };

  return (
    <Component
      href={href}
      onClick={onClick}
      className={cn(
        "px-5 py-2.5 rounded-lg font-semibold transition-all duration-200 transform",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

export const MobileNavHeader = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      {children}
    </div>
  );
};

export const MobileNavToggle = ({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
      aria-label="Toggle menu"
    >
      <svg
        className="w-6 h-6 text-neutral-900 dark:text-neutral-100"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {isOpen ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        )}
      </svg>
    </button>
  );
};

export const MobileNavMenu = ({
  children,
  className,
  isOpen,
  onClose,
}: {
  children: React.ReactNode;
  className?: string;
  isOpen: boolean;
  onClose: () => void;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 pt-4 pb-2 border-t border-neutral-800 mt-4 overflow-hidden transition-all duration-300",
        isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
        className
      )}
    >
      {children}
    </div>
  );
};
