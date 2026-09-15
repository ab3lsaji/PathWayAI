"use client";

import React from "react";
import { GitFork, X } from "lucide-react";

interface RoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  targetRole: string;
  setTargetRole: (val: string) => void;
  academicStage: string;
  setAcademicStage: (val: string) => void;
  currentSkills: string;
  setCurrentSkills: (val: string) => void;
}

export function RoadmapModal({
  isOpen,
  onClose,
  onSubmit,
  targetRole,
  setTargetRole,
  academicStage,
  setAcademicStage,
  currentSkills,
  setCurrentSkills,
}: RoadmapModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in transition-opacity duration-300">
      <div className="bg-white/95 dark:bg-zinc-950/95 border border-slate-300/80 dark:border-zinc-800/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative text-slate-900 dark:text-zinc-100 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitFork className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Generate Visual Flowchart Roadmap
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-800 dark:hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1">
              Target Role
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              required
              className="w-full bg-slate-50/80 dark:bg-zinc-900/80 border border-slate-300 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              placeholder="e.g. Data Engineer, AI Research Engineer"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1">
              Academic Stage
            </label>
            <select
              value={academicStage}
              onChange={(e) => setAcademicStage(e.target.value)}
              className="w-full bg-slate-50/80 dark:bg-zinc-900/80 border border-slate-300 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
            >
              <option>High School / Class 12</option>
              <option>College Student / Undergraduate</option>
              <option>Postgraduate / Master's</option>
              <option>Working Professional</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1">
              Current Skills / Background
            </label>
            <input
              type="text"
              value={currentSkills}
              onChange={(e) => setCurrentSkills(e.target.value)}
              className="w-full bg-slate-50/80 dark:bg-zinc-900/80 border border-slate-300 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              placeholder="e.g. Python, SQL, Git"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-semibold text-xs rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              Generate Canvas
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}