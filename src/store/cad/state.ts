import type { CADAnalysisState } from './state/analysisState';
import type { CADCoreState } from './state/coreState';
import type { CADModelingState } from './state/modelingState';
import type { CADWorkflowState } from './state/workflowState';

export interface CADState extends CADCoreState, CADModelingState, CADWorkflowState, CADAnalysisState {}
