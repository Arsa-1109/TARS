import { useState, useCallback } from 'react';
import { WorkspaceId, SearchCitation } from '../types/contracts';

export function useNavigationStore() {
  const [workspace, setWorkspace] = useState<WorkspaceId>('knowledge');
  const [actionHubOpen, setActionHubOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [citationState, setCitationState] = useState<{ open: boolean; citation: SearchCitation | null }>({
    open: false,
    citation: null,
  });
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [activeDecisionId, setActiveDecisionId] = useState<string | null>(null);
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);

  const openCitation = useCallback((citation: SearchCitation) => {
    setCitationState({ open: true, citation });
  }, []);

  const closeCitation = useCallback(() => {
    setCitationState((prev) => ({ ...prev, open: false }));
  }, []);

  const navigateToSource = useCallback((sourceType: string, sourceId: string) => {
    if (sourceType === 'CALL') {
      setActiveCallId(sourceId);
      setWorkspace('calls');
    } else if (sourceType === 'DECISION') {
      setActiveDecisionId(sourceId);
      setWorkspace('decisions');
    } else if (sourceType === 'ARCHITECTURE') {
      setActiveFindingId(sourceId);
      setWorkspace('decisions');
    } else if (sourceType === 'CHAT') {
      setWorkspace('thinktank');
    }
    setActionHubOpen(false);
  }, []);

  return {
    workspace,
    setWorkspace,
    actionHubOpen,
    setActionHubOpen,
    moreSheetOpen,
    setMoreSheetOpen,
    citationState,
    openCitation,
    closeCitation,
    activeCallId,
    setActiveCallId,
    activeDecisionId,
    setActiveDecisionId,
    activeFindingId,
    setActiveFindingId,
    navigateToSource,
  };
}
