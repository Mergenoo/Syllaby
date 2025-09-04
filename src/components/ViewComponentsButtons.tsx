"use client";
import React from "react";
import { useRouter } from "next/navigation";

export default function ViewComponentsButtons({ id }: { id: string }) {
  const router = useRouter();

  const handleViewComponents = () => {
    router.push(`/projects/${id}`);
  };

  return (
    <button
      onClick={handleViewComponents}
      className="cursor-pointer text-indigo-600 px-3 py-1 rounded-md text-sm hover:text-indigo-700 transition-colors"
    >
      View Components
    </button>
  );
}
