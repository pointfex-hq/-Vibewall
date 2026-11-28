"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons";

/** Small illustrated brand tile from the Figma reference. */
export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-2xl shadow-figma"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(145deg, #F3B9C4 0%, #E88AA0 100%)",
      }}
      aria-hidden="true"
    >
      <span className="font-heading font-black text-white" style={{ fontSize: size * 0.5 }}>
        W
      </span>
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="figma-kicker mb-1">{eyebrow}</p>}
        <h2 className="font-heading text-lg font-extrabold text-on-surface sm:text-xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

/** Tilted photo card used in the landing "Living Memory Quilt" preview. */
export function MemoryPolaroid({
  src,
  caption,
  author,
  glyph,
  href,
}: {
  src: string;
  caption: string;
  author: string;
  glyph?: "heart" | "sparkle";
  href?: string;
}) {
  const inner = (
    <>
      <span className="figma-tape" />
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-surface-container-low">
        <Image src={src} alt={caption} fill className="object-cover" sizes="260px" />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <p className="truncate font-heading text-xs font-bold text-on-surface">{caption}</p>
          <p className="truncate text-[10px] text-on-surface-variant">{author}</p>
        </div>
        <Icon
          name={glyph === "sparkle" ? "auto_awesome" : "favorite"}
          size={16}
          className={glyph === "sparkle" ? "text-tertiary" : "text-primary"}
        />
      </div>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="figma-polaroid block w-full max-w-[260px] transition-transform hover:rotate-0">
        {inner}
      </Link>
    );
  }
  return <div className="figma-polaroid w-full max-w-[260px]">{inner}</div>;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: string;
}) {
  return (
    <div className="figma-card flex min-w-0 flex-1 items-center gap-3 p-3 sm:p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-primary">
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="font-heading text-xl font-black text-on-surface sm:text-2xl">{value}</span>
          {hint && <span className="truncate text-[10px] font-semibold text-tertiary">{hint}</span>}
        </div>
      </div>
    </div>
  );
}

export function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="figma-card flex gap-3 p-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-on-primary">
        {number}
      </span>
      <div>
        <h3 className="font-heading text-sm font-extrabold text-on-surface">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{description}</p>
      </div>
    </div>
  );
}

export function AvatarBubble({
  label,
  color = "#A61C3C",
  size = 36,
}: {
  label: string;
  color?: string;
  size?: number;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-heading text-xs font-black text-white"
      style={{ width: size, height: size, background: color }}
    >
      {label.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function HashtagPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="figma-pill bg-[#4A3B38] text-white">
      <span className="h-1.5 w-1.5 rounded-full bg-[#E7C27A]" />
      {children}
    </span>
  );
}

/** Bottom navigation from the Figma mobile wall frame. All items are real links. */
export function FigmaBottomNav({
  code,
  host,
  active = "feed",
}: {
  code: string;
  host?: boolean;
  active?: "feed" | "polls" | "host";
}) {
  const items = [
    { key: "feed" as const, label: "Feed", href: `/r/${code}/wall`, icon: "grid_view" },
    { key: "polls" as const, label: "Polls", href: `/r/${code}/wall#poll`, icon: "how_to_vote" },
    { key: "host" as const, label: host ? "Host" : "Portal", href: host ? `/host/${code}` : "/", icon: "person" },
  ];
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-around border-t border-outline/50 bg-surface/95 px-2 pt-2 pb-safe backdrop-blur-xl md:hidden"
    >
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={active === item.key ? "page" : undefined}
          className={`flex min-w-[64px] flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[10px] font-bold transition-colors ${
            active === item.key ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <Icon name={item.icon} size={19} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
