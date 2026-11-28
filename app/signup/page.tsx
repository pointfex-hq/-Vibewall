import React, { Suspense } from "react";
import AuthScreen from "@/components/figma/AuthScreen";

export const metadata = {
  title: "Create Account — VibeWall",
  description: "Create your VibeWall account.",
};

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FFF8F5]" />}>
      <AuthScreen variant="signup" />
    </Suspense>
  );
}
