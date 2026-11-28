import React, { Suspense } from "react";
import AuthScreen from "@/components/figma/AuthScreen";

export const metadata = {
  title: "Sign In — VibeWall",
  description: "Sign in to your VibeWall account.",
};

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FFF8F5]" />}>
      <AuthScreen />
    </Suspense>
  );
}
