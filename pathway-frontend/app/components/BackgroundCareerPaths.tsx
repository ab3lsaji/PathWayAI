"use client";

import React from "react";

interface BackgroundCareerPathsProps {
  hasStarted?: boolean;
}

export default function BackgroundCareerPaths({ hasStarted = false }: BackgroundCareerPathsProps) {
  return (
    <div 
      className={`absolute inset-0 pointer-events-none overflow-hidden z-0 select-none transition-opacity duration-700 ${
        hasStarted ? "opacity-15" : "opacity-80"
      }`}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1000 600"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="journeyGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.95" />
          </linearGradient>

          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <linearGradient id="nodeCoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>

        {/* Curved Path */}
        <path
          d="M 160 480 C 280 400, 380 260, 500 210 C 660 160, 780 150, 900 130"
          stroke="url(#journeyGradient)"
          strokeWidth="4"
          fill="none"
          strokeDasharray="10 8"
          className="animate-pulse"
        />

        {/* Central Glowing Node */}
        <g filter="url(#glow)">
          <circle cx="160" cy="480" r="14" className="fill-cyan-500 animate-pulse" />
          <circle cx="160" cy="480" r="22" stroke="#06b6d4" strokeWidth="2.5" fill="none" />

          <circle cx="500" cy="210" r="75" className="fill-cyan-400/20 animate-ping" />
          <circle cx="500" cy="210" r="52" stroke="#38bdf8" strokeWidth="3" fill="none" opacity="0.8" />
          <circle cx="500" cy="210" r="42" fill="url(#nodeCoreGradient)" />

          <text
            x="500"
            y="213"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-white text-3xl font-extrabold"
          >
            ⚡
          </text>

          <circle cx="900" cy="130" r="14" className="fill-emerald-500 animate-pulse" />
          <circle cx="900" cy="130" r="22" stroke="#10b981" strokeWidth="2.5" fill="none" />
        </g>
      </svg>

      {/* START: ANIMATED THINKING BOY (BLUE THEME) */}
      <div className="absolute bottom-10 left-8 md:left-16 w-52 h-80 flex flex-col items-center">
        <div className="mb-2 ml-12 px-3 py-1.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 shadow-md backdrop-blur-md flex items-center gap-1.5 animate-float">
          <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 font-michroma">
            How do I get there? ✨
          </span>
        </div>

        <div className="relative w-full h-8 flex justify-center items-center ml-8">
          <span className="absolute w-2 h-2 rounded-full bg-cyan-400/80 animate-ping -top-1 left-[58%]" />
          <span className="absolute w-3 h-3 rounded-full bg-cyan-500/60 bottom-0 left-[53%]" />
          <span className="absolute w-1.5 h-1.5 rounded-full bg-blue-400/70 bottom-3 left-[48%]" />
        </div>

        <svg
          viewBox="0 0 100 160"
          className="w-28 h-48 text-cyan-500 dark:text-cyan-400 fill-current drop-shadow-md"
        >
          <g className="origin-[48px_28px] -rotate-12">
            <circle cx="48" cy="24" r="11" />
            <path d="M 38 18 C 40 10, 52 8, 58 16 C 54 14, 44 14, 38 18 Z" />
          </g>
          <path d="M 36 40 L 60 40 L 56 90 L 40 90 Z" />
          <path
            d="M 38 46 L 24 62 L 44 32"
            stroke="currentColor"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            className="animate-pulse"
          />
          <path
            d="M 58 44 L 64 68 L 60 76"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <rect x="41" y="90" width="6" height="52" rx="3" />
          <rect x="49" y="90" width="6" height="52" rx="3" />
          <path d="M 33 142 L 47 142 L 47 147 L 33 147 Z" />
          <path d="M 49 142 L 63 142 L 63 147 L 49 147 Z" />
        </svg>
      </div>

      {/* END: EMPLOYED PERSON / GOAL ACHIEVER (GREEN THEME) */}
      <div className="absolute top-10 right-12 md:right-32 w-48 h-80 flex flex-col items-center">
        <div className="mb-1 px-3 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 shadow-md backdrop-blur-md flex items-center gap-1.5 animate-float">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-michroma">
            Goal Achieved! 🎉
          </span>
        </div>

        <div className="relative w-full h-8 flex justify-center items-center mr-6">
          <span className="absolute w-2 h-2 rounded-full bg-emerald-400/80 animate-ping -top-1 left-[45%]" />
          <span className="absolute w-3 h-3 rounded-full bg-emerald-500/60 bottom-0 left-[50%]" />
          <span className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400/70 bottom-3 left-[55%]" />
        </div>

        <svg
          viewBox="0 0 100 160"
          className="w-28 h-48 text-emerald-600 dark:text-emerald-400 fill-current drop-shadow-lg"
        >
          <circle cx="50" cy="24" r="11" />
          <path d="M 40 18 C 45 10, 58 10, 60 18 Z" />
          <path d="M 32 40 L 68 40 L 62 92 L 38 92 Z" />
          <path d="M 48 40 L 52 40 L 51 60 L 49 60 Z" fill="#ffffff" />
          <path
            d="M 34 44 L 20 70"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          <rect x="10" y="68" width="16" height="12" rx="2" fill="currentColor" />
          <path d="M 15 68 L 15 65 L 21 65 L 21 68" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path
            d="M 66 44 L 80 28"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          <rect x="40" y="92" width="8" height="52" rx="3" />
          <rect x="52" y="92" width="8" height="52" rx="3" />
          <path d="M 32 144 L 48 144 L 48 149 L 32 149 Z" />
          <path d="M 52 144 L 68 144 L 68 149 L 52 149 Z" />
        </svg>
      </div>
    </div>
  );
}