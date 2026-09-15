"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Clock,
  Circle,
  ArrowRight,
  X,
  BookOpen,
  Code2,
  Sparkles,
} from "lucide-react";

export interface Node {
  id: string | number;
  label: string;
  phase?: string;
  description: string;
  status?: "TO_DO" | "IN_PROGRESS" | "DONE";
  subtopics?: string[];
  projects?: string[];
}

export interface RoadmapData {
  title?: string;
  role?: string;
  nodes: Node[];
  edges?: any[];
}

interface RoadmapCanvasProps {
  data: RoadmapData;
  sessionId: string | null;
  onAskAI?: (prompt: string) => void;
}

export default function RoadmapCanvas({
  data,
  sessionId,
  onAskAI,
}: RoadmapCanvasProps) {
  const [nodes, setNodes] = useState<Node[]>(data.nodes || []);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Sync internal state when props change
  useEffect(() => {
    setNodes(data.nodes || []);
  }, [data]);

  const handleStatusToggle = async (
    e: React.MouseEvent,
    nodeId: string | number,
    currentStatus?: string
  ) => {
    // Prevent triggering the card click modal event when clicking the status badge
    e.stopPropagation();

    const stringNodeId = String(nodeId);

    // Cycle state sequence: TO_DO -> IN_PROGRESS -> DONE -> TO_DO
    const nextStatus: "TO_DO" | "IN_PROGRESS" | "DONE" =
      !currentStatus || currentStatus === "TO_DO"
        ? "IN_PROGRESS"
        : currentStatus === "IN_PROGRESS"
        ? "DONE"
        : "TO_DO";

    setUpdatingId(stringNodeId);

    // 1. Optimistic UI update
    setNodes((prevNodes) =>
      prevNodes.map((node) =>
        String(node.id) === stringNodeId ? { ...node, status: nextStatus } : node
      )
    );

    // Sync selected modal node if open
    if (selectedNode && String(selectedNode.id) === stringNodeId) {
      setSelectedNode((prev) => (prev ? { ...prev, status: nextStatus } : null));
    }

    // 2. Persist update to SQLite via backend API
    if (sessionId) {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/api/roadmap/node-status",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session_id: sessionId,
              node_id: stringNodeId,
              status: nextStatus,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Server returned status ${response.status}`);
        }
      } catch (err) {
        console.error("Failed to persist node status update:", err);

        // Rollback optimistic update on failure
        setNodes((prevNodes) =>
          prevNodes.map((node) =>
            String(node.id) === stringNodeId
              ? {
                  ...node,
                  status:
                    (currentStatus as "TO_DO" | "IN_PROGRESS" | "DONE") ||
                    "TO_DO",
                }
              : node
          )
        );
      } finally {
        setUpdatingId(null);
      }
    } else {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "DONE":
        return {
          label: "Completed",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
          styles:
            "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25",
        };
      case "IN_PROGRESS":
        return {
          label: "In Progress",
          icon: (
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-spin-slow" />
          ),
          styles:
            "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25",
        };
      default:
        return {
          label: "To Do",
          icon: <Circle className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />,
          styles:
            "bg-slate-200/80 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 border-slate-300 dark:border-zinc-700/60 hover:bg-slate-300 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-200",
        };
    }
  };

  // Dynamic fallback breakdown for nodes when custom subtopics aren't sent from backend
  const getSubtopics = (node: Node) => {
    if (node.subtopics && node.subtopics.length > 0) return node.subtopics;

    const labelLower = node.label.toLowerCase();
    if (labelLower.includes("math") || labelLower.includes("python")) {
      return [
        "Linear Algebra: Vectors, Matrix operations, Eigenvalues & Eigenvectors",
        "Calculus & Optimization: Partial Derivatives, Gradient Descent",
        "Probability & Statistics: Distributions, Bayes' Theorem, Hypothesis Testing",
        "Data Manipulation: Advanced Python, Pandas, and NumPy workflows",
      ];
    } else if (
      labelLower.includes("machine learning") ||
      labelLower.includes("data science")
    ) {
      return [
        "Supervised Learning: Linear/Logistic Regression, Decision Trees, Ensembles",
        "Unsupervised Learning: K-Means Clustering, PCA Dimensionality Reduction",
        "Model Evaluation: Confusion Matrices, Precision, Recall, ROC-AUC",
        "Feature Engineering: Preprocessing, Scaling, and Scikit-Learn Pipelines",
      ];
    } else if (
      labelLower.includes("deep learning") ||
      labelLower.includes("neural")
    ) {
      return [
        "Neural Network Fundamentals: Perceptrons, Activation Functions, Loss Functions",
        "Architectures: CNNs for Computer Vision, Transformers for Sequential Data",
        "Training Mechanics: Backpropagation, Adam Optimizer, Regularization",
        "Frameworks: Model building with PyTorch or TensorFlow",
      ];
    }

    return [
      "Understand core theoretical foundations and key terminology",
      "Set up hands-on development environment and local playground",
      "Implement fundamental algorithms and practical exercises",
      "Build and document a small domain-specific milestone project",
    ];
  };

  const getProjects = (node: Node) => {
    if (node.projects && node.projects.length > 0) return node.projects;

    const labelLower = node.label.toLowerCase();
    if (labelLower.includes("math") || labelLower.includes("python")) {
      return [
        "Matrix Operations Engine: Implement matrix multiplication from scratch",
        "Exploratory Data Analysis: Perform EDA on a real-world dataset",
      ];
    } else if (labelLower.includes("machine learning")) {
      return [
        "Predictive Model: Build a Customer Churn prediction pipeline",
        "Regression Benchmark: House Price Prediction using Scikit-Learn",
      ];
    } else if (labelLower.includes("deep learning")) {
      return [
        "Image Classifier: Train a CNN on CIFAR-10 using PyTorch",
        "Text Classifier: Fine-tune a pre-trained Transformer model",
      ];
    }

    return [
      "Capstone Project: Build an end-to-end module demonstrating this skill",
    ];
  };

  return (
    <div className="my-4 p-5 sm:p-6 bg-white/70 dark:bg-zinc-950/80 border border-slate-300/80 dark:border-zinc-800/90 rounded-2xl shadow-xl backdrop-blur-2xl space-y-4 transition-all">
      {/* Canvas Header */}
      {(data.title || data.role) && (
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800/80">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              {data.title || `${data.role} Learning Path`}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Click any step to view description & details. Toggle badges to update status.
            </p>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 border border-cyan-300/70 dark:border-cyan-800/50 rounded-lg shadow-2xs font-semibold shrink-0">
            Interactive Canvas
          </span>
        </div>
      )}

      {/* Node Flow Representation */}
      <div className="space-y-3">
        {nodes.map((node, index) => {
          const badge = getStatusBadge(node.status);
          const isLast = index === nodes.length - 1;
          const nodeStrId = String(node.id || index);

          return (
            <React.Fragment key={nodeStrId}>
              {/* Interactive Step Card */}
              <div
                onClick={() => setSelectedNode(node)}
                className="group relative p-4 bg-white/80 dark:bg-zinc-900/80 border border-slate-200/90 dark:border-zinc-800/90 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 rounded-xl transition-all duration-300 shadow-xs hover:shadow-md backdrop-blur-xl cursor-pointer hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.995]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 font-bold bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-300/60 dark:border-cyan-800/50">
                        Step {index + 1}
                      </span>
                      {node.phase && (
                        <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 uppercase tracking-wide">
                          {node.phase}
                        </span>
                      )}
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                        {node.label}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed line-clamp-2">
                      {node.description}
                    </p>
                  </div>

                  {/* Status Toggle Action */}
                  <button
                    type="button"
                    onClick={(e) => handleStatusToggle(e, node.id, node.status)}
                    disabled={updatingId === nodeStrId}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg border transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs ${badge.styles}`}
                    title="Click to toggle status"
                  >
                    {badge.icon}
                    <span>{badge.label}</span>
                  </button>
                </div>
              </div>

              {/* Edge Visual Connector */}
              {!isLast && (
                <div className="flex justify-center py-0.5">
                  <ArrowRight className="w-4 h-4 text-slate-400 dark:text-zinc-700 rotate-90 opacity-70" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Detail Modal */}
      {selectedNode && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white/95 dark:bg-zinc-950/95 border border-slate-300/80 dark:border-zinc-800/90 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl backdrop-blur-2xl overflow-hidden relative text-slate-900 dark:text-zinc-100">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-zinc-800/80 flex items-start justify-between bg-slate-50/50 dark:bg-zinc-900/50">
              <div className="space-y-1.5 pr-6">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-300/60 dark:border-cyan-800/80">
                    Detailed Step Guide
                  </span>
                  <div
                    onClick={(e) =>
                      handleStatusToggle(e, selectedNode.id, selectedNode.status)
                    }
                    className="cursor-pointer"
                  >
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-lg border transition-transform hover:scale-105 active:scale-95 ${
                        getStatusBadge(selectedNode.status).styles
                      }`}
                    >
                      {getStatusBadge(selectedNode.status).icon}
                      {getStatusBadge(selectedNode.status).label}
                    </span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {selectedNode.label}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="p-1.5 text-slate-400 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-200/60 dark:bg-zinc-900 hover:bg-slate-300 dark:hover:bg-zinc-800 rounded-xl transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-800 dark:text-zinc-200 text-sm leading-relaxed scrollbar-thin">
              {/* Overview */}
              <div className="bg-slate-100/70 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800/80 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Overview
                </h4>
                <p className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">
                  {selectedNode.description}
                </p>
              </div>

              {/* Learning Curriculum / Concepts */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>Key Concepts & Topics to Master</span>
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {getSubtopics(selectedNode).map((subtopic, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-slate-50/80 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/60 rounded-xl text-slate-700 dark:text-zinc-300 text-xs shadow-2xs"
                    >
                      <CheckCircle2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                      <span className="font-medium">{subtopic}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested Projects */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-2">
                  <Code2 className="w-4 h-4" />
                  <span>Recommended Hands-on Projects</span>
                </h4>
                <div className="space-y-2">
                  {getProjects(selectedNode).map((project, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50/80 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/60 rounded-xl text-slate-700 dark:text-zinc-300 text-xs flex items-center justify-between shadow-2xs"
                    >
                      <span className="font-medium">{project}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Action Controls */}
            <div className="p-4 border-t border-slate-200 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  if (onAskAI) {
                    onAskAI(
                      `Can you guide me on how to complete the step "${selectedNode.label}"? Please provide key code snippets and learning recommendations.`
                    );
                  }
                  setSelectedNode(null);
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Ask AI Mentor About This Step</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-semibold rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}