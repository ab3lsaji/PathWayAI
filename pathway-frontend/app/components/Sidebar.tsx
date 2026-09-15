"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MessageSquare, Plus, Trash2, LogIn, LogOut } from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";

interface Session {
  session_id: string;
  title: string;
  created_at: string;
}

interface SidebarProps {
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  refreshTrigger?: number;
}

function PathwayLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 group ${className}`}>
      <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-md group-hover:bg-cyan-400/40 transition-all duration-300" />
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]"
      >
        <defs>
          <linearGradient id="orbitGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <radialGradient id="corePulse" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a5f3fc" />
            <stop offset="60%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0284c7" />
          </radialGradient>
        </defs>

        <circle
          cx="50"
          cy="50"
          r="43"
          stroke="url(#orbitGlow)"
          strokeWidth="2.5"
          strokeDasharray="12 8 4 8"
          strokeLinecap="round"
          className="opacity-70 animate-[spin_12s_linear_infinite_reverse]"
        />
        <g className="animate-[spin_6s_linear_infinite] origin-center">
          <circle cx="50" cy="14" r="3.5" fill="#38bdf8" />
          <circle cx="86" cy="50" r="3.5" fill="#06b6d4" />
          <circle cx="50" cy="86" r="3.5" fill="#3b82f6" />
          <circle cx="14" cy="50" r="3.5" fill="#0284c7" />
          <path
            d="M 50 14 L 86 50 L 50 86 L 14 50 Z"
            stroke="url(#orbitGlow)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            opacity="0.5"
          />
        </g>
        <circle
          cx="50"
          cy="50"
          r="26"
          stroke="#06b6d4"
          strokeWidth="1.5"
          className="animate-ping origin-center opacity-30"
        />
        <circle
          cx="50"
          cy="50"
          r="26"
          stroke="#38bdf8"
          strokeWidth="1.5"
          opacity="0.6"
        />
        <circle
          cx="50"
          cy="50"
          r="12"
          fill="url(#corePulse)"
          className="animate-pulse"
        />
        <circle cx="50" cy="50" r="5" fill="#ffffff" />
      </svg>
    </div>
  );
}

export function Sidebar({
  currentSessionId,
  onSelectSession,
  onNewChat,
  isOpen,
  refreshTrigger,
}: SidebarProps) {
  const { data: authSession, status } = useSession();
  const [sessions, setSessions] = useState<Session[]>([]);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSessions = useCallback(async () => {
    if (status === "loading") return;

    const headers: Record<string, string> = {};
    const tokenOrEmail = authSession?.idToken || authSession?.user?.email;

    if (tokenOrEmail) {
      headers["Authorization"] = `Bearer ${tokenOrEmail}`;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/api/sessions", { headers });
      if (res.ok) {
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error loading chat history:", err);
    }
  }, [authSession, status]);

  useEffect(() => {
    fetchSessions();

    // Delayed re-fetch (1.5s) to guarantee catching asynchronous title generation on backend
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollTimerRef.current = setTimeout(() => {
      fetchSessions();
    }, 1500);

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [currentSessionId, refreshTrigger, fetchSessions]);

  const handleDeleteSession = async (
    e: React.MouseEvent,
    sessionId: string
  ) => {
    e.stopPropagation();

    try {
      const headers: Record<string, string> = {};
      const tokenOrEmail = authSession?.idToken || authSession?.user?.email;

      if (tokenOrEmail) {
        headers["Authorization"] = `Bearer ${tokenOrEmail}`;
      }

      const res = await fetch(
        `http://127.0.0.1:8000/api/sessions/${sessionId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
        if (currentSessionId === sessionId) {
          onNewChat();
        }
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  return (
    <aside
      className={`bg-white/60 dark:bg-zinc-950/60 border-r border-slate-200/80 dark:border-zinc-800/80 backdrop-blur-xl text-slate-800 dark:text-zinc-200 p-3 flex flex-col h-screen shrink-0 transition-all duration-300 z-30 ${
        isOpen ? "w-64" : "w-16 items-center"
      }`}
    >
      {isOpen ? (
        <div className="flex items-center gap-2.5 px-1 pt-1 pb-3 w-full">
          <button
            onClick={onNewChat}
            title="Start New Chat"
            className="hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          >
            <PathwayLogo className="w-8 h-8" />
          </button>
          <span className="text-base font-bold tracking-wide text-slate-900 dark:text-white select-none">
            PathwayAI
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center mb-2 pt-1">
          <button
            onClick={onNewChat}
            title="Start New Chat"
            className="hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          >
            <PathwayLogo className="w-9 h-9" />
          </button>
        </div>
      )}

      {isOpen ? (
        <button
          onClick={onNewChat}
          className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-100/70 dark:bg-zinc-900/60 hover:bg-slate-200/80 dark:hover:bg-zinc-800/80 text-slate-800 dark:text-zinc-100 transition text-sm font-medium mb-6 shadow-xs active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span>New Roadmap Chat</span>
        </button>
      ) : (
        <button
          onClick={onNewChat}
          title="New Roadmap Chat"
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-100/70 dark:bg-zinc-900/60 hover:bg-slate-200/80 dark:hover:bg-zinc-800/80 text-cyan-600 dark:text-cyan-400 transition mb-6 shadow-xs active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}

      {isOpen && (
        <div className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2 px-2 w-full select-none">
          Recent Chats
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-1 w-full pr-0.5 scrollbar-thin">
        {sessions.map((session) => (
          <div
            key={session.session_id}
            onClick={() => onSelectSession(session.session_id)}
            title={!isOpen ? session.title : undefined}
            className={`group flex items-center ${
              isOpen
                ? "justify-between w-full p-2.5"
                : "justify-center w-9 h-9 mx-auto"
            } rounded-lg text-sm text-left transition cursor-pointer ${
              currentSessionId === session.session_id
                ? "bg-slate-200/70 dark:bg-zinc-800/80 text-cyan-600 dark:text-cyan-400 font-medium"
                : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900/80 hover:text-slate-900 dark:hover:text-zinc-200"
            }`}
          >
            {isOpen ? (
              <>
                <div className="flex items-center gap-2.5 truncate pr-2">
                  <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />
                  <span className="truncate">{session.title}</span>
                </div>

                <button
                  onClick={(e) => handleDeleteSession(e, session.session_id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 dark:hover:text-red-400 transition-opacity rounded"
                  title="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 dark:border-zinc-800 pt-3 mt-auto w-full">
        {authSession ? (
          isOpen ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2 truncate pr-1">
                {authSession.user?.image ? (
                  <Image
                    src={authSession.user.image}
                    alt="User Profile"
                    width={28}
                    height={28}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-cyan-600 flex items-center justify-center text-white text-xs font-bold">
                    {authSession.user?.name?.[0] || "U"}
                  </div>
                )}
                <div className="truncate text-xs">
                  <p className="font-medium truncate text-slate-900 dark:text-zinc-100">
                    {authSession.user?.name}
                  </p>
                  <p className="text-slate-500 dark:text-zinc-400 truncate">
                    {authSession.user?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => signOut()}
                title="Sign out"
                className="p-1.5 text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => signOut()}
              title={`Sign out (${authSession.user?.email})`}
              className="w-9 h-9 mx-auto flex items-center justify-center rounded-xl bg-slate-100/70 dark:bg-zinc-900/60 hover:bg-red-500/10 text-slate-600 dark:text-zinc-400 hover:text-red-500 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )
        ) : isOpen ? (
          <button
            onClick={() => signIn("google")}
            className="flex items-center justify-center gap-2 w-full p-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 transition text-xs font-medium cursor-pointer shadow-xs"
          >
            <LogIn className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Sign in with Google</span>
          </button>
        ) : (
          <button
            onClick={() => signIn("google")}
            title="Sign in with Google"
            className="w-9 h-9 mx-auto flex items-center justify-center rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-cyan-600 dark:text-cyan-400 transition cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}