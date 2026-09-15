"use client";

import React, { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User, Bot, Zap, ExternalLink, FileText } from "lucide-react";
import RoadmapCanvas, { RoadmapData } from "./RoadmapCanvas";

export interface UploadedFile {
  name: string;
  type: string;
  data: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string | null;
  file?: UploadedFile | null;
  roadmapData?: RoadmapData;
}

interface MessageItemProps {
  msg: Message;
  sessionId: string | null;
  currentThinkingText: string;
}

export const MessageItem = memo(function MessageItem({
  msg,
  sessionId,
  currentThinkingText,
}: MessageItemProps) {
  const displayContent = msg.roadmapData
    ? msg.content.replace(/```json[\s\S]*?```/g, "").trim()
    : msg.content;

  const attachedImageUrl =
    msg.image || (msg.file?.type.startsWith("image/") ? msg.file.data : null);

  return (
    <div
      className={`flex items-start gap-4 transition-all duration-500 ease-in-out opacity-100 ${
        msg.role === "user" ? "flex-row-reverse" : "flex-row"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md transition-all duration-300 ${
          msg.role === "user"
            ? "bg-slate-900 dark:bg-zinc-100 text-white dark:text-black font-bold"
            : "bg-white/70 dark:bg-zinc-900/70 border border-slate-300/80 dark:border-zinc-800/80 text-slate-700 dark:text-zinc-300 backdrop-blur-md"
        }`}
      >
        {msg.role === "user" ? (
          <User className="w-5 h-5" />
        ) : (
          <Bot className="w-5 h-5" />
        )}
      </div>

      <div
        className={`max-w-[88%] text-base md:text-lg leading-relaxed transition-all duration-500 ease-out ${
          msg.role === "user"
            ? "bg-white/80 dark:bg-zinc-900/90 text-slate-900 dark:text-zinc-100 border border-slate-300/80 dark:border-zinc-800/80 rounded-2xl rounded-tr-none px-5 py-3.5 shadow-md text-base backdrop-blur-xl"
            : "bg-transparent text-slate-800 dark:text-zinc-200 border-none p-0"
        }`}
      >
        {attachedImageUrl && (
          <div className="mb-3">
            <div className="overflow-hidden rounded-xl border border-slate-300 dark:border-zinc-800 max-w-sm shadow-sm">
              <img
                src={attachedImageUrl}
                alt="Uploaded visual content"
                className="w-full object-cover max-h-64 rounded-xl"
              />
            </div>
          </div>
        )}

        {msg.file && !msg.file.type.startsWith("image/") && (
          <div className="mb-3">
            <div className="flex items-center gap-3 p-3 bg-white/80 dark:bg-zinc-950/80 border border-slate-300 dark:border-zinc-800 rounded-xl max-w-xs shadow-sm backdrop-blur-md">
              <FileText className="w-6 h-6 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <div className="overflow-hidden text-xs">
                <p className="font-medium text-slate-800 dark:text-zinc-200 truncate">
                  {msg.file.name}
                </p>
                <p className="text-slate-400 dark:text-zinc-500 uppercase">
                  {msg.file.name.split(".").pop() || "DOCUMENT"}
                </p>
              </div>
            </div>
          </div>
        )}

        {displayContent ? (
          <div
            className="prose dark:prose-invert max-w-none space-y-4 text-slate-800 dark:text-zinc-200 text-base md:text-lg leading-relaxed animate-fade-in transition-opacity duration-500 ease-in-out
              [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2
              [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-2
              [&_li]:text-slate-700 dark:[&_li]:text-zinc-300 [&_li]:leading-relaxed
              [&_strong]:text-slate-900 dark:[&_strong]:text-white [&_strong]:font-semibold
              [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-slate-900 dark:[&_h1]:text-white [&_h1]:mt-3
              [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_h2]:mt-3
              [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-slate-900 dark:[&_h3]:text-white [&_h3]:mt-2
              [&_p]:leading-relaxed"
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ node, ...props }) => (
                  <a
                    {...props}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:underline underline-offset-4 font-medium transition-colors cursor-pointer"
                  >
                    {props.children}
                    <ExternalLink className="w-4 h-4 opacity-80 inline shrink-0" />
                  </a>
                ),
              }}
            >
              {displayContent}
            </ReactMarkdown>
          </div>
        ) : !msg.roadmapData ? (
          <div className="flex items-center gap-3 text-slate-600 dark:text-zinc-300 py-2 px-4 bg-white/60 dark:bg-zinc-900/60 border border-slate-300/50 dark:border-zinc-800/50 rounded-2xl backdrop-blur-md shadow-xs animate-pulse w-fit">
            <Zap className="w-4 h-4 text-cyan-600 dark:text-cyan-400 animate-spin" />
            <span
              key={currentThinkingText}
              className="text-sm font-medium tracking-wide"
            >
              {currentThinkingText}
            </span>
          </div>
        ) : null}

        {msg.roadmapData && (
          <div className="mt-3 animate-fade-in transition-all duration-500">
            <RoadmapCanvas data={msg.roadmapData} sessionId={sessionId} />
          </div>
        )}
      </div>
    </div>
  );
});