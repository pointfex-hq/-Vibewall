"use client";

import React from "react";
import * as lucide from "lucide-react";

/**
 * Shared offline icon component.
 *
 * All icons render from the bundled `lucide-react` package (no external CDN,
 * no Google Fonts). Material Symbols names used by the original design are
 * mapped to the closest Lucide components, preserving size, color, alignment,
 * spacing and animations.
 */
const ICON_MAP: Record<string, keyof typeof lucide> = {
  add: "Plus",
  add_a_photo: "ImagePlus",
  add_circle: "PlusCircle",
  add_photo: "ImagePlus",
  add_photo_alternate: "ImagePlus",
  admin_panel_settings: "ShieldCheck",
  arrow_back: "ArrowLeft",
  arrow_forward: "ArrowRight",
  badge: "Badge",
  block: "Ban",
  bolt: "Zap",
  chat: "MessageSquare",
  check: "Check",
  check_circle: "CheckCircle2",
  chevron_left: "ChevronLeft",
  chevron_right: "ChevronRight",
  close: "X",
  content_copy: "Copy",
  delete: "Trash2",
  download: "Download",
  edit_note: "Pencil",
  error: "AlertCircle",
  favorite: "Heart",
  flag: "Flag",
  fullscreen: "Maximize2",
  how_to_vote: "Vote",
  keyboard: "Keyboard",
  login: "LogIn",
  log_out: "LogOut",
  location_on: "MapPin",
  more_horiz: "MoreHorizontal",
  more_vert: "EllipsisVertical",
  palette: "Palette",
  photo_camera: "Camera",
  photo_camera_back: "CameraOff",
  photo_library: "Images",
  progress_activity: "LoaderCircle",
  publish: "Send",
  push_pin: "Pin",
  radio_button_unchecked: "Circle",
  refresh: "RotateCcw",
  restore: "RotateCcw",
  rocket_launch: "Rocket",
  schedule: "Clock",
  send: "Send",
  sensors: "RadioTower",
  share: "Share2",
  shield_lock: "ShieldCheck",
  sync: "RefreshCw",
  tune: "SlidersHorizontal",
  tv: "Tv2",
  verified: "CheckCircle2",
  visibility: "Eye",
  visibility_off: "EyeOff",
  warning: "AlertTriangle",
  // Host dashboard tab icons
  shield: "Shield",
  poll: "BarChart3",
  settings: "Settings",
  hourglass_empty: "Hourglass",
};

interface IconProps {
  /** Material Symbols icon name (legacy naming) — mapped to the Lucide component. */
  name: string;
  /** Pixel size. Defaults to 20. */
  size?: number | string;
  className?: string;
  /** Render filled — equivalent of the Material Symbols `fill` variant. */
  filled?: boolean;
}

export function Icon({ name, size = 20, className = "", filled }: IconProps) {
  const key = ICON_MAP[name] ?? name;
  const Component = (lucide as unknown as Record<string, React.ComponentType<any> | undefined>)[key];
  if (!Component) return null;
  return (
    <Component
      size={size}
      className={[filled && "fill-current", className].filter(Boolean).join(" ")}
    />
  );
}
