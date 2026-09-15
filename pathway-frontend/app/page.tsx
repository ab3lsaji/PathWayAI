"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Sidebar } from "./components/Sidebar";
import RoadmapCanvas, { RoadmapData } from "./components/RoadmapCanvas";
import ThemeToggle from "./components/ThemeToggle";
import { AmbientBackground } from "./components/AmbientBackground";
import BackgroundCareerPaths from "./components/BackgroundCareerPaths";
import {
  Send,
  User,
  Bot,
  Zap,
  ExternalLink,
  GitFork,
  X,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  FileText,
  Download,
} from "lucide-react";

interface UploadedFile {
  name: string;
  type: string;
  data: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string | null;
  file?: UploadedFile | null;
  roadmapData?: RoadmapData;
}

const THINKING_PHRASES = [
  "Thinking...",
  "Synthesizing response...",
  "Mapping career paths...",
  "Connecting nodes...",
  "Crafting your roadmap...",
];

const extractRoadmapFromContent = (content: string): RoadmapData | null => {
  if (!content) return null;
  try {
    let parsed: any = null;
    const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      parsed = JSON.parse(codeBlockMatch[1].trim());
    } else {
      const jsonMatch = content.match(/(\{[\s\S]*"nodes"[\s\S]*\})/);
      if (jsonMatch && jsonMatch[0]) {
        parsed = JSON.parse(jsonMatch[0].trim());
      }
    }

    if (parsed && Array.isArray(parsed.nodes)) {
      return {
        ...parsed,
        nodes: parsed.nodes.map((node: any, idx: number) => ({
          ...node,
          id: node.id ? String(node.id) : `node-${idx}`,
          label: node.label || node.title || `Step ${idx + 1}`,
          status: node.status || "TO_DO",
        })),
      };
    }
  } catch (e) {
    // Ignore partial json stream parse errors
  }
  return null;
};

export default function Home() {
  const { data: authSession, status: authStatus } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [thinkingIndex, setThinkingIndex] = useState(0);

  const [isRevealed, setIsRevealed] = useState(false);

  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarKey, setSidebarKey] = useState(0);

  const [showRoadmapModal, setShowRoadmapModal] = useState(false);
  const [targetRole, setTargetRole] = useState("Machine Learning Engineer");
  const [academicStage, setAcademicStage] = useState("College Student / Undergraduate");
  const [currentSkills, setCurrentSkills] = useState("Python, Basic Algebra");
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const tokenOrEmail =
      (authSession as any)?.idToken || authSession?.user?.email;
    if (tokenOrEmail) {
      headers["Authorization"] = `Bearer ${tokenOrEmail}`;
    }
    return headers;
  }, [authSession]);

  // ★ FIXED: Wait until auth is ready before restoring the session
  useEffect(() => {
    // Don't run while NextAuth is still loading
    if (authStatus === "loading") return;

    const savedSessionId = localStorage.getItem("pathway_session_id");
    if (savedSessionId) {
      handleSelectSession(savedSessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus]);   // ← depends on authStatus

  useEffect(() => {
    const handleMouseMove = () => {
      setIsRevealed(true);
    };

    window.addEventListener("mousemove", handleMouseMove, { once: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGeneratingRoadmap]);

  useEffect(() => {
    if (!isLoading) {
      setThinkingIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setThinkingIndex((prev) => (prev + 1) % THINKING_PHRASES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        128
      )}px`;
    }
  }, [input]);

  const handleSelectSession = useCallback(
    async (selectedSessionId: string) => {
      setSessionId(selectedSessionId);
      localStorage.setItem("pathway_session_id", selectedSessionId);
      setIsLoading(true);
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/api/sessions/${selectedSessionId}`,
          {
            headers: getAuthHeaders(),
          }
        );
        if (!response.ok) {
          // Session is gone or we don't have permission → clean up
          console.warn("Session not found or unauthorized, clearing it");
          localStorage.removeItem("pathway_session_id");
          setSessionId(null);
          setMessages([]);
          return;
        }

        const data = await response.json();
        const historyMessages: Message[] = data.messages || data;
        const nodeProgress: Record<string, "TO_DO" | "IN_PROGRESS" | "DONE"> =
          data.node_progress || {};

        const processedMessages = historyMessages.map((msg) => {
          if (msg.role === "assistant") {
            const extracted = extractRoadmapFromContent(msg.content);
            if (extracted) {
              const hydratedNodes = extracted.nodes.map((node) => {
                const strId = String(node.id);
                return {
                  ...node,
                  id: strId,
                  status: nodeProgress[strId] || node.status || "TO_DO",
                };
              });

              return {
                ...msg,
                roadmapData: { ...extracted, nodes: hydratedNodes },
              };
            }
          }
          return msg;
        });

        setMessages(processedMessages);
        setIsRevealed(true);
      } catch (err) {
        console.error("Error fetching session details:", err);
        // Also clean up on network error
        localStorage.removeItem("pathway_session_id");
        setSessionId(null);
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    },
    [getAuthHeaders]
  );

  const handleExportDocx = async (content: string) => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/export/docx", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          content: content,
          filename: "PathwayAI_Career_Plan.docx",
        }),
      });

      if (!response.ok) throw new Error("Failed to export Word document");

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "PathwayAI_Career_Plan.docx";
      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Docx Export Error:", err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedFile({
        name: file.name,
        type: file.type,
        data: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSend = async (userInput?: string) => {
    const query = userInput || input;
    if ((!query.trim() && !selectedFile) || isLoading) return;

    const isImageFile = selectedFile?.type.startsWith("image/");
    const imagePayload = isImageFile ? selectedFile?.data : null;

    const userMsg: Message = {
      role: "user",
      content: query,
      image: imagePayload,
      file: selectedFile,
    };
    const updatedHistory = [...messages, userMsg];

    setMessages(updatedHistory);
    setInput("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsLoading(true);

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: getAuthHeaders(),
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          session_id: sessionId,
          messages: updatedHistory,
        }),
      });

      if (!response.body) throw new Error("No response body");

      const returnedHeaderSessionId = response.headers.get("X-Session-ID");
      if (returnedHeaderSessionId && !sessionId) {
        setSessionId(returnedHeaderSessionId);
        localStorage.setItem("pathway_session_id", returnedHeaderSessionId);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantResponse += chunk;

        setMessages((prev) => {
          const newHistory = [...prev];
          newHistory[newHistory.length - 1] = {
            role: "assistant",
            content: assistantResponse,
            roadmapData:
              extractRoadmapFromContent(assistantResponse) || undefined,
          };
          return newHistory;
        });
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: "⚠️ **Error**: Failed to connect to PathwayAI backend.",
        },
      ]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
      // Trigger sidebar update immediately and shortly after stream completion
      setSidebarKey((prev) => prev + 1);
    }
  };

  const handleGenerateVisualRoadmap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRole.trim() || isGeneratingRoadmap) return;

    setIsGeneratingRoadmap(true);
    setShowRoadmapModal(false);

    const userPrompt = `🗺️ Generate an interactive visual roadmap for **${targetRole}** (${academicStage}).`;
    const userMsg: Message = { role: "user", content: userPrompt };
    const updatedHistory = [...messages, userMsg];

    setMessages(updatedHistory);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/roadmap", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          session_id: sessionId,
          role: targetRole,
          academic_stage: academicStage,
          current_skills: currentSkills,
          messages: updatedHistory,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate visual roadmap");

      const responseData = await res.json();
      const activeSessionId =
        responseData.session_id ||
        res.headers.get("X-Session-ID") ||
        sessionId;

      if (activeSessionId) {
        setSessionId(activeSessionId);
        localStorage.setItem("pathway_session_id", activeSessionId);
      }

      const roadmapGraph: RoadmapData =
        responseData.roadmap_data || responseData;

      const assistantMsgContent = `Here is your customized visual interactive roadmap for **${targetRole}**:\n\n\`\`\`json\n${JSON.stringify(
        roadmapGraph,
        null,
        2
      )}\n\`\`\``;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: assistantMsgContent,
          roadmapData: roadmapGraph,
        },
      ]);

      setSidebarKey((prev) => prev + 1);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ **Error**: Failed to generate structured visual roadmap graph.",
        },
      ]);
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const handleNewChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setSessionId(null);
    localStorage.removeItem("pathway_session_id");
    setMessages([]);
    setSelectedFile(null);
  };

  const hasStarted = messages.length > 0;
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const hasFile = !!(lastUserMsg?.file || lastUserMsg?.image);
  const currentThinkingText = hasFile
    ? "Analyzing document/image context..."
    : THINKING_PHRASES[thinkingIndex];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-zinc-100 font-sans antialiased overflow-hidden relative transition-colors duration-200">
      <AmbientBackground />

      <div className="h-full shrink-0 z-20 transition-all duration-300">
        <Sidebar
          key={sidebarKey}
          refreshTrigger={sidebarKey}
          currentSessionId={sessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          isOpen={isSidebarOpen}
        />
      </div>

      <main className="flex-1 flex flex-col h-full bg-transparent backdrop-blur-3xl relative z-10 overflow-hidden transition-colors">
        <BackgroundCareerPaths hasStarted={hasStarted} />

        <div className="p-4 md:px-6 flex items-center justify-between z-20">
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            aria-label={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            className="p-2 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-xl bg-white/40 dark:bg-zinc-900/40 hover:bg-white/80 dark:hover:bg-zinc-800/80 border border-slate-300/50 dark:border-zinc-800/50 shadow-xs backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="w-5 h-5" />
            ) : (
              <PanelLeftOpen className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            )}
          </button>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>

        <div
          className={`flex-1 flex flex-col max-w-4xl w-full mx-auto px-4 md:px-12 transition-all duration-700 overflow-hidden ${
            hasStarted ? "justify-between pb-6" : "justify-center pb-12"
          }`}
        >
          {!hasStarted && (
            <div
              className={`w-full flex flex-col items-center text-center transition-all duration-700 mt-20 ${
                isRevealed ? "opacity-100 scale-100" : "opacity-0 scale-95"
              }`}
            >
              <h1 className="font-metal text-4xl md:text-6xl tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-slate-900 via-cyan-600 to-slate-700 dark:from-slate-100 dark:via-cyan-400 dark:to-slate-800 drop-shadow-[0_0_18px_rgba(6,182,212,0.4)] uppercase">
                PATHWAY AI
              </h1>
              <p className="font-sans text-sm md:text-base lg:text-lg font-medium tracking-widest text-cyan-700 dark:text-cyan-200/90 drop-shadow-[0_0_8px_rgba(6,182,212,0.3)] max-w-lg leading-relaxed mt-2 mb-8 uppercase">
                NAVIGATE YOUR CAREER BEFORE YOU BUILD IT.
              </p>

              <div className="w-full max-w-2xl relative z-30">
                {selectedFile && (
                  <div className="mb-2 relative inline-block text-left">
                    {selectedFile.type.startsWith("image/") ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-300 dark:border-zinc-700 w-20 h-20 bg-white dark:bg-zinc-900 group shadow-sm">
                        <img
                          src={selectedFile.data}
                          alt="Preview attachment"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={removeSelectedFile}
                          className="absolute top-1 right-1 bg-black/80 hover:bg-red-600 text-white p-1 rounded-full transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative flex items-center gap-2.5 px-3 py-2 bg-white/90 dark:bg-zinc-900/90 border border-slate-300 dark:border-zinc-700 rounded-xl pr-8 shadow-sm backdrop-blur-md">
                        <FileText className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                        <span className="text-xs text-slate-800 dark:text-zinc-200 max-w-[180px] truncate font-medium">
                          {selectedFile.name}
                        </span>
                        <button
                          type="button"
                          onClick={removeSelectedFile}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-zinc-800/80 rounded-lg transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="relative flex items-center bg-white/80 dark:bg-zinc-950/80 border border-slate-300/80 dark:border-zinc-800/80 focus-within:border-cyan-500/80 dark:focus-within:border-cyan-500/80 focus-within:ring-4 focus-within:ring-cyan-500/10 rounded-2xl shadow-xl backdrop-blur-2xl transition-all duration-300"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.txt,image/*"
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isGeneratingRoadmap}
                    className="absolute left-3 p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 rounded-xl hover:bg-slate-100/80 dark:hover:bg-zinc-900/80 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                    title="Attach document, resume, or image"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <textarea
                    ref={textareaRef}
                    rows={1}
                    className="w-full bg-transparent pl-12 pr-14 py-4 text-base text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none resize-none max-h-32 text-left"
                    placeholder="Ask about career roadmaps, skill gaps, or upload resume/notes......"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    disabled={isLoading || isGeneratingRoadmap}
                  />

                  <button
                    type="submit"
                    disabled={
                      isLoading ||
                      isGeneratingRoadmap ||
                      (!input.trim() && !selectedFile)
                    }
                    className="absolute right-3 p-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white disabled:opacity-30 text-white dark:text-black rounded-xl transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {hasStarted && (
            <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-zinc-800">
              {messages.map((msg, index) => {
                const displayContent = msg.roadmapData
                  ? msg.content.replace(/```json[\s\S]*?```/g, "").trim()
                  : msg.content;

                const attachedImageUrl =
                  msg.image ||
                  (msg.file?.type.startsWith("image/") ? msg.file.data : null);

                return (
                  <div
                    key={index}
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
                        <div className="space-y-2">
                          <div className="prose dark:prose-invert max-w-none space-y-4 text-slate-800 dark:text-zinc-200 text-base md:text-lg leading-relaxed animate-fade-in transition-opacity duration-500 ease-in-out">
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

                          {msg.role === "assistant" && (
                            <button
                              onClick={() => handleExportDocx(displayContent)}
                              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-white/50 dark:bg-zinc-900/50 hover:bg-white/80 dark:hover:bg-zinc-800/80 border border-slate-300/60 dark:border-zinc-800/60 rounded-xl transition-all shadow-xs backdrop-blur-md cursor-pointer"
                              title="Download response as a Word document"
                            >
                              <Download className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                              <span>Download Word File</span>
                            </button>
                          )}
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
                          <RoadmapCanvas
                            data={msg.roadmapData}
                            sessionId={sessionId}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isGeneratingRoadmap && (
                <div className="flex items-center gap-3 p-4 bg-white/80 dark:bg-zinc-950/80 border border-slate-300/80 dark:border-zinc-800/80 rounded-2xl text-sm text-slate-700 dark:text-zinc-300 max-w-md mx-auto shadow-md backdrop-blur-md animate-fade-in">
                  <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400 animate-spin" />
                  <span>Architecting interactive flowchart with RAG vectors...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {hasStarted && (
            <div className="w-full transition-all duration-700 ease-in-out relative z-30 sticky bottom-0 pt-2 opacity-100 translate-y-0">
              {selectedFile && (
                <div className="mb-2 relative inline-block">
                  {selectedFile.type.startsWith("image/") ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-300 dark:border-zinc-700 w-20 h-20 bg-white dark:bg-zinc-900 group shadow-sm">
                      <img
                        src={selectedFile.data}
                        alt="Preview attachment"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeSelectedFile}
                        className="absolute top-1 right-1 bg-black/80 hover:bg-red-600 text-white p-1 rounded-full transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative flex items-center gap-2.5 px-3 py-2 bg-white/90 dark:bg-zinc-900/90 border border-slate-300 dark:border-zinc-700 rounded-xl pr-8 shadow-sm backdrop-blur-md">
                      <FileText className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                      <span className="text-xs text-slate-800 dark:text-zinc-200 max-w-[180px] truncate font-medium">
                        {selectedFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={removeSelectedFile}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-zinc-800/80 rounded-lg transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="relative flex items-center bg-white/80 dark:bg-zinc-950/80 border border-slate-300/80 dark:border-zinc-800/80 focus-within:border-cyan-500/80 dark:focus-within:border-cyan-500/80 focus-within:ring-4 focus-within:ring-cyan-500/10 rounded-2xl shadow-xl backdrop-blur-2xl transition-all duration-300"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.txt,image/*"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isGeneratingRoadmap}
                  className="absolute left-3 p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 rounded-xl hover:bg-slate-100/80 dark:hover:bg-zinc-900/80 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                  title="Attach document, resume, or image"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <textarea
                  ref={textareaRef}
                  rows={1}
                  className="w-full bg-transparent pl-12 pr-14 py-4 text-base text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none resize-none max-h-32"
                  placeholder="Ask about career roadmaps, skill gaps, or upload resume/notes......"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={isLoading || isGeneratingRoadmap}
                />

                <button
                  type="submit"
                  disabled={
                    isLoading ||
                    isGeneratingRoadmap ||
                    (!input.trim() && !selectedFile)
                  }
                  className="absolute right-3 p-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white disabled:opacity-30 text-white dark:text-black rounded-xl transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>

        {showRoadmapModal && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in transition-opacity duration-300"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white/95 dark:bg-zinc-950/95 border border-slate-300/80 dark:border-zinc-800/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative text-slate-900 dark:text-zinc-100 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitFork className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Generate Visual Flowchart Roadmap
                  </h3>
                </div>
                <button
                  onClick={() => setShowRoadmapModal(false)}
                  className="text-slate-400 hover:text-slate-800 dark:hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleGenerateVisualRoadmap} className="space-y-4">
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
                    Current Skills / Experience
                  </label>
                  <textarea
                    rows={2}
                    value={currentSkills}
                    onChange={(e) => setCurrentSkills(e.target.value)}
                    className="w-full bg-slate-50/80 dark:bg-zinc-900/80 border border-slate-300 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 resize-none"
                    placeholder="e.g. Python, SQL, Linear Algebra..."
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRoadmapModal(false)}
                    className="px-4 py-2 text-xs md:text-sm font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGeneratingRoadmap || !targetRole.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs md:text-sm font-medium rounded-xl transition-all shadow-md hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Roadmap</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}