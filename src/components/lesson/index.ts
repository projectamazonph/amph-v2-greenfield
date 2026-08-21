// src/components/lesson/index.ts
// Barrel for lesson authoring primitives.
// All components are MDX-emitted by name; this index lets users import
// from "@/components/lesson" outside the renderer if needed.

export { SelfCheck } from "./SelfCheck";
export { TradeOffTable } from "./TradeOffTable";
export { ProcessDiagram } from "./ProcessDiagram";
export { PitfallCallout } from "./PitfallCallout";
export { VisualLessonBlock } from "./VisualLessonBlock";
export {
  ComparisonTable,
  FormulaLadder,
  ClassificationBoard,
  DecisionFlow,
  SimulationRubric,
} from "./TrancheOneVisuals";
export type {
  ComparisonTableProps,
  ComparisonTableRow,
  FormulaLadderProps,
  FormulaLadderStep,
  ClassificationBoardProps,
  ClassificationCategory,
  ClassificationItem,
  DecisionFlowProps,
  DecisionFlowStep,
  SimulationRubricProps,
  SimulationRubricCriterion,
} from "./TrancheOneVisuals";
export {
  AnnotatedListingCanvas,
  HierarchyBuilder,
  FunnelCanvas,
  TimelineCalendar,
  CompetitiveGapMatrix,
  InsightRouter,
} from "./TrancheTwoVisuals";
export {
  LessonPathway,
  SimulationBriefBuilder,
  PortfolioMap,
  SeasonalCalendar,
  EvidenceLedger,
  SovPositioner,
} from "./TrancheThreeVisuals";
export type {
  LessonPathwayProps,
  PathwayStep,
  SimulationBriefBuilderProps,
  BriefField,
  PortfolioMapProps,
  PortfolioGroup,
  PortfolioCampaign,
  SeasonalCalendarProps,
  SeasonalPhase,
  EvidenceLedgerProps,
  EvidenceEntry,
  SovPositionerProps,
  SovBand,
} from "./TrancheThreeVisuals";
export type {
  AnnotatedListingCanvasProps,
  ListingSection,
  HierarchyBuilderProps,
  HierarchyNode,
  FunnelCanvasProps,
  FunnelStage,
  TimelineCalendarProps,
  TimelineRow,
  CompetitiveGapMatrixProps,
  CompetitiveGap,
  InsightRouterProps,
  InsightRoute,
} from "./TrancheTwoVisuals";
