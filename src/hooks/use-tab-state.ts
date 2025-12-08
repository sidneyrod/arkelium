import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useWorkspaceStore } from '@/stores/workspaceStore';

/**
 * Hook to manage tab scroll position and form state persistence
 */
export const useTabState = (containerId?: string) => {
  const location = useLocation();
  const { tabs, activeTabId, updateTabScrollPosition, setTabUnsavedChanges, updateTabFormState } = useWorkspaceStore();
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const isRestoringScroll = useRef(false);

  const getTabIdFromPath = (path: string) => path.replace(/^\//, '') || 'dashboard';
  const currentTabId = getTabIdFromPath(location.pathname);
  const currentTab = tabs.find(t => t.id === currentTabId);

  // Save scroll position when scrolling
  useEffect(() => {
    const container = containerId 
      ? document.getElementById(containerId) 
      : document.querySelector('[data-scroll-container]') as HTMLElement;
    
    if (!container) return;
    
    scrollContainerRef.current = container;

    const handleScroll = () => {
      if (isRestoringScroll.current) return;
      updateTabScrollPosition(currentTabId, container.scrollTop);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [currentTabId, containerId, updateTabScrollPosition]);

  // Restore scroll position when tab becomes active
  useEffect(() => {
    if (!scrollContainerRef.current || !currentTab?.scrollPosition) return;

    isRestoringScroll.current = true;
    
    requestAnimationFrame(() => {
      if (scrollContainerRef.current && currentTab.scrollPosition) {
        scrollContainerRef.current.scrollTop = currentTab.scrollPosition;
      }
      // Allow new scroll events after a brief delay
      setTimeout(() => {
        isRestoringScroll.current = false;
      }, 100);
    });
  }, [activeTabId, currentTab?.scrollPosition]);

  // Mark tab as having unsaved changes
  const setUnsavedChanges = useCallback((hasChanges: boolean) => {
    setTabUnsavedChanges(currentTabId, hasChanges);
  }, [currentTabId, setTabUnsavedChanges]);

  // Save form state to tab
  const saveFormState = useCallback((formState: Record<string, any>) => {
    updateTabFormState(currentTabId, formState);
  }, [currentTabId, updateTabFormState]);

  // Get saved form state
  const getFormState = useCallback(() => {
    return currentTab?.formState || {};
  }, [currentTab?.formState]);

  return {
    setUnsavedChanges,
    saveFormState,
    getFormState,
    currentTab,
  };
};
