import { useEffect, useState, useCallback } from "react";
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  EdgeTypes,
  EdgeProps,
  Background,
  Controls,
  MiniMap,
  Panel,
  Handle,
  Position,
  MarkerType,
  type ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
  Info,
  AlertTriangle,
  Link2,
  GitBranch,
  FileText,
  CheckSquare,
  Search,
  Zap,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useI18n } from "../../lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import {
  Button,
} from "../ui/button";
import {
  ScrollArea,
} from "../ui/scroll-area";

interface MindmapNodeData {
  label: string;
  type: "file" | "memory" | "instruction" | "task" | "research";
  fullContent?: string;
  category?: string;
  fullText?: string;
  status?: string;
  excerpt?: string;
  fileName?: string;
}

interface MindmapEdgeData {
  relationship: "references" | "supports" | "contradicts" | "depends_on";
  confidence: number;
  explanation?: string;
}

interface MindmapNode {
  id: string;
  type: string;
  label: string;
  data?: MindmapNodeData;
}

interface MindmapEdge {
  id: string;
  source: string;
  target: string;
  relationship: "references" | "supports" | "contradicts" | "depends_on";
  confidence: number;
  explanation?: string;
}

interface MindmapData {
  nodes: MindmapNode[];
  edges: MindmapEdge[];
}

interface ExplainResponse {
  explanation: string;
  citations: string[];
}

const relationshipColors = {
  references: "#3b82f6", // blue
  supports: "#22c55e", // green
  contradicts: "#ef4444", // red
  depends_on: "#f59e0b", // amber
};

const relationshipLabels = {
  references: "references",
  supports: "supports",
  contradicts: "contradicts",
  depends_on: "depends on",
};

const relationshipIcons = {
  references: Link2,
  supports: CheckSquare,
  contradicts: AlertTriangle,
  depends_on: GitBranch,
};

const nodeTypeIcons = {
  file: FileText,
  memory: Zap,
  instruction: GitBranch,
  task: CheckSquare,
  research: Search,
};

const nodeTypeColors = {
  file: "#3b82f6",
  memory: "#8b5cf6",
  instruction: "#06b6d4",
  task: "#22c55e",
  research: "#f59e0b",
};

interface CustomNodeProps {
  data: MindmapNodeData;
  selected: boolean;
}

function CustomNode({ data, selected }: CustomNodeProps) {
  const Icon = nodeTypeIcons[data.type] || FileText;
  const color = nodeTypeColors[data.type] || "#6b7280";

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-1 px-3 py-2 rounded-lg border-2 transition-all duration-200",
        "bg-white dark:bg-gray-800",
        selected ? "border-2 shadow-lg" : "border-1",
        `border-[${color}]`,
      )}
      style={{ minWidth: 160, maxWidth: 220 }}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2" style={{ background: color }} />
      <div className="flex items-center gap-1.5">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[${color}]/15">
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <span className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2" style={{ background: color }} />
    </div>
  );
}

interface CustomEdgeProps {
  data?: MindmapEdgeData;
}

function CustomEdge({ data }: CustomEdgeProps) {
  if (!data) return null;
  const color = relationshipColors[data.relationship] || "#6b7280";
  const Icon = relationshipIcons[data.relationship] || Link2;

  return (
    <>
      <path
        className="stroke-[${color}] stroke-[1.5px]"
        strokeDasharray={data.relationship === "depends_on" ? "5,5" : "none"}
        markerEnd={MarkerType.ArrowClosed}
        style={{ stroke: color, strokeWidth: 1.5 }}
      />
      {data.confidence > 0.8 && (
        <text className="text-xs fill-[${color}]" textAnchor="middle" dominantBaseline="middle">
          <tspan x="50%" y="50%">{Math.round(data.confidence * 100)}%</tspan>
        </text>
      )}
    </>
  );
}

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge as unknown as EdgeTypes[string],
};

export function ProjectMindmap({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [explainDialogOpen, setExplainDialogOpen] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<Edge<MindmapEdgeData> | null>(null);
  const [explanation, setExplanation] = useState("");
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [inferLoading, setInferLoading] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true);

  // Fetch mindmap data
  const { data: mindmapData, isLoading, error, refetch } = useQuery<MindmapData>({
    queryKey: ["project-mindmap", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/infinity/projects/${encodeURIComponent(projectId)}/mindmap`);
      if (!response.ok) throw new Error("Failed to load mindmap");
      return (await response.json()) as MindmapData;
    },
    enabled: !!projectId,
  });

  // Infer connections mutation
  const inferMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/infinity/projects/${encodeURIComponent(projectId)}/mindmap/infer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceRegenerate: true }),
      });
      if (!response.ok) throw new Error("Failed to infer connections");
      return (await response.json()) as { connections: MindmapEdge[]; inferred: number; cached: boolean };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-mindmap", projectId] });
      setInferLoading(false);
    },
    onError: () => {
      setInferLoading(false);
    },
  });

  // Explain edge mutation
  const explainMutation = useMutation({
    mutationFn: async (edge: Edge<MindmapEdgeData>) => {
      const sourceNode = reactFlowInstance?.getNodes().find((n: Node) => n.id === edge.source);
      const targetNode = reactFlowInstance?.getNodes().find((n: Node) => n.id === edge.target);

      if (!sourceNode || !targetNode) {
        throw new Error("Nodes not found");
      }

      const sourceType = (sourceNode.data as MindmapNodeData).type;
      const sourceId = sourceNode.id.split(":")[1];
      const targetType = (targetNode.data as MindmapNodeData).type;
      const targetId = targetNode.id.split(":")[1];

      const response = await fetch(`/api/infinity/projects/${encodeURIComponent(projectId)}/mindmap/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeA: { type: sourceType, id: sourceId },
          nodeB: { type: targetType, id: targetId },
        }),
      });
      if (!response.ok) throw new Error("Failed to explain connection");
      return (await response.json()) as ExplainResponse;
    },
    onSuccess: (data) => {
      setExplanation(data.explanation);
      setExplanationLoading(false);
    },
    onError: () => {
      setExplanation("Failed to generate explanation.");
      setExplanationLoading(false);
    },
  });

  // Convert API data to React Flow nodes/edges
  const initialNodes: Node<MindmapNodeData>[] = (mindmapData?.nodes ?? []).map((n: MindmapNode) => ({
    id: n.id,
    type: "custom",
    position: { x: 0, y: 0 }, // Will be auto-layouted
    data: (n.data ?? { label: n.label, type: "file" }) as MindmapNodeData,
  }));

  const initialEdges: Edge<MindmapEdgeData>[] = (mindmapData?.edges ?? []).map((e: MindmapEdge) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "custom",
    data: {
      relationship: e.relationship,
      confidence: e.confidence,
      explanation: e.explanation,
    } as MindmapEdgeData,
    style: { stroke: relationshipColors[e.relationship], strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: relationshipColors[e.relationship] },
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState<MindmapNodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<MindmapEdgeData>(initialEdges);

  // Handle edge click for "Explain This"
  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge<MindmapEdgeData>) => {
    setSelectedEdge(edge);
    setExplainDialogOpen(true);
    setExplanationLoading(true);
    explainMutation.mutate(edge);
  }, [explainMutation]);

  // Handle infer connections
  const handleInfer = useCallback(() => {
    setInferLoading(true);
    inferMutation.mutate();
  }, [inferMutation]);

  // Handle viewport fit
  const handleFitView = useCallback(() => {
    reactFlowInstance?.fitView({ padding: 0.1, duration: 500 });
  }, [reactFlowInstance]);

  // Auto-layout on data change (simple force-directed would be better but this works for MVP)
  useEffect(() => {
    if (nodes.length > 0 && reactFlowInstance) {
      // Simple grid layout for initial render
      const cols = Math.ceil(Math.sqrt(nodes.length));
      const spacingX = 280;
      const spacingY = 180;
      const centeredNodes = nodes.map((node, index) => ({
        ...node,
        position: {
          x: (index % cols) * spacingX - (cols - 1) * spacingX / 2,
          y: Math.floor(index / cols) * spacingY - (Math.ceil(nodes.length / cols) - 1) * spacingY / 2,
        },
      }));
      setNodes(centeredNodes);
      reactFlowInstance.fitView({ padding: 0.1, duration: 300 });
    }
  }, [mindmapData, reactFlowInstance, nodes.length, setNodes]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="text-gray-600 dark:text-gray-400">{t("projectMindmap.loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <p className="text-gray-600 dark:text-gray-400">{t("projectMindmap.error")}</p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("projectMindmap.retry")}
          </Button>
        </div>
      </div>
    );
  }

  const hasData = (mindmapData?.nodes.length ?? 0) > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t("projectMindmap.title")}
          </h2>
          {hasData && (
            <span className="text-xs text-gray-500 dark:text-gray-500 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
              {mindmapData!.nodes.length} {t("projectMindmap.nodes")}, {mindmapData!.edges.length} {t("projectMindmap.connections")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFitView}
            disabled={!hasData}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <ChevronRight className="w-4 h-4" />
            <span>{t("projectMindmap.fitView")}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMiniMap(!showMiniMap)}
            className="gap-1"
          >
            {showMiniMap ? (
              <>
                <span className="text-xs">{t("projectMindmap.hideMinimap")}</span>
              </>
            ) : (
              <>
                <span className="text-xs">{t("projectMindmap.showMinimap")}</span>
              </>
            )}
          </Button>

          <Button
            variant={hasData ? "default" : "outline"}
            size="sm"
            onClick={handleInfer}
            disabled={inferLoading}
            className="gap-1"
          >
            <RefreshCw className={cn("w-4 h-4", inferLoading && "animate-spin")} />
            <span>{inferLoading ? t("projectMindmap.inferring") : t("projectMindmap.inferConnections")}</span>
          </Button>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={(params: Connection) => setEdges((eds) => addEdge(params, eds))}
          onEdgeClick={onEdgeClick}
          onPaneClick={() => setSelectedEdge(null)}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView={false}
          attributionPosition="bottom-right"
        >
          <Background
            color="#e5e7eb"
            gap={16}
            size={1}
          />
          <Controls
            showZoom={true}
            showFitView={false}
            showInteractive={false}
          />
          {showMiniMap && (
            <MiniMap
              nodeColor={(node: Node) => nodeTypeColors[(node.data as MindmapNodeData)?.type as keyof typeof nodeTypeColors] || "#6b7280"}
              nodeStrokeColor={(node: Node) => node.selected ? "#3b82f6" : "transparent"}
              nodeBorderRadius={4}
              nodeClassName={(node: Node) => node.selected ? "ring-2 ring-blue-500" : ""}
              maskColor="rgba(59, 130, 246, 0.1)"
            />
          )}
        </ReactFlow>

        {/* Legend Panel */}
        <Panel position="bottom-left" className="p-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="font-medium text-gray-700 dark:text-gray-300">{t("projectMindmap.nodeTypes")}</div>
            <div className="font-medium text-gray-700 dark:text-gray-300">{t("projectMindmap.relationships")}</div>
            {Object.entries(nodeTypeIcons).map(([type, Icon]) => (
              <div key={type} className="flex items-center gap-1.5 col-span-2">
                <Icon className="w-3.5 h-3.5" style={{ color: nodeTypeColors[type as keyof typeof nodeTypeColors] }} />
                <span className="capitalize text-gray-600 dark:text-gray-400">{type}</span>
              </div>
            ))}
            {Object.entries(relationshipIcons).map(([rel, Icon]) => (
              <div key={rel} className="flex items-center gap-1.5 col-span-2">
                <Icon className="w-3.5 h-3.5" style={{ color: relationshipColors[rel as keyof typeof relationshipColors] }} />
                <span className="text-gray-600 dark:text-gray-400">{relationshipLabels[rel as keyof typeof relationshipLabels]}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Empty State */}
        {!hasData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <GitBranch className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {t("projectMindmap.emptyTitle")}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-xs">
              {t("projectMindmap.emptyDescription")}
            </p>
            <Button onClick={handleInfer} disabled={inferLoading} className="gap-2">
              <RefreshCw className={cn("w-4 h-4", inferLoading && "animate-spin")} />
              {inferLoading ? t("projectMindmap.inferring") : t("projectMindmap.inferConnections")}
            </Button>
          </div>
        )}
      </div>

      {/* Explain Dialog */}
      <Dialog open={explainDialogOpen} onOpenChange={setExplainDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[70vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              {t("projectMindmap.explainTitle")}
            </DialogTitle>
            <DialogDescription>
              {selectedEdge?.data
                ? `${relationshipLabels[selectedEdge.data.relationship]} (${Math.round(selectedEdge.data.confidence * 100)}% confidence)`
                : t("projectMindmap.explainDescription")}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[50vh] pr-2">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {explanationLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : explanation ? (
                <p className="whitespace-pre-wrap">{explanation}</p>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">{t("projectMindmap.noExplanation")}</p>
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={() => setExplainDialogOpen(false)}>
              <X className="w-4 h-4 mr-2" />
              {t("projectMindmap.close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
