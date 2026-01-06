import { useNavigate, useLocation } from 'react-router-dom';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { cn } from '@/lib/utils';
import { X, Circle, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState, useRef, useEffect, useCallback } from 'react';

const WorkspaceTabs = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeTabId, closeTab, setActiveTab, closeAllTabs, closeOtherTabs, reorderTabs, currentUserId, userTabs } = useWorkspaceStore();
  
  // Get current user's tabs
  const tabs = currentUserId && userTabs[currentUserId] ? userTabs[currentUserId] : [];
  const [confirmClose, setConfirmClose] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const [isScrollDragging, setIsScrollDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  
  // Tab reordering state
  const [draggedTabIndex, setDraggedTabIndex] = useState<number | null>(null);
  const [dragOverTabIndex, setDragOverTabIndex] = useState<number | null>(null);

  // Handle horizontal scroll with mouse wheel
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Drag-to-scroll handlers (for scrolling the container)
  const handleScrollMouseDown = useCallback((e: React.MouseEvent) => {
    // Only trigger scroll drag if clicking on the container background, not on a tab
    if ((e.target as HTMLElement).closest('[data-tab]')) return;
    
    const container = scrollContainerRef.current;
    if (!container) return;
    
    setIsScrollDragging(true);
    setStartX(e.pageX - container.offsetLeft);
    setScrollLeft(container.scrollLeft);
  }, []);

  const handleScrollMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isScrollDragging) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 1.5;
    container.scrollLeft = scrollLeft - walk;
  }, [isScrollDragging, startX, scrollLeft]);

  const handleScrollMouseUp = useCallback(() => {
    setIsScrollDragging(false);
  }, []);

  const handleScrollMouseLeave = useCallback(() => {
    setIsScrollDragging(false);
  }, []);

  // Tab reordering handlers
  const handleTabDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedTabIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }, []);

  const handleTabDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTabIndex(index);
  }, []);

  const handleTabDragLeave = useCallback(() => {
    setDragOverTabIndex(null);
  }, []);

  const handleTabDrop = useCallback((e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = draggedTabIndex;
    
    if (fromIndex !== null && fromIndex !== toIndex) {
      reorderTabs(fromIndex, toIndex);
    }
    
    setDraggedTabIndex(null);
    setDragOverTabIndex(null);
  }, [draggedTabIndex, reorderTabs]);

  const handleTabDragEnd = useCallback(() => {
    setDraggedTabIndex(null);
    setDragOverTabIndex(null);
  }, []);

  // Update fade indicators based on scroll position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateFades = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setShowLeftFade(scrollLeft > 5);
      setShowRightFade(scrollLeft < scrollWidth - clientWidth - 5);
    };

    updateFades();
    container.addEventListener('scroll', updateFades);
    window.addEventListener('resize', updateFades);
    
    return () => {
      container.removeEventListener('scroll', updateFades);
      window.removeEventListener('resize', updateFades);
    };
  }, [tabs]);

  const handleTabClick = (tab: { id: string; path: string }) => {
    if (tab.id !== activeTabId) {
      setActiveTab(tab.id);
      navigate(tab.path);
    }
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const tab = tabs.find(t => t.id === tabId);
    
    // Check for unsaved changes
    if (tab?.hasUnsavedChanges) {
      setConfirmClose(tabId);
      return;
    }
    
    performCloseTab(tabId);
  };

  const performCloseTab = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    const remainingTabs = tabs.filter(t => t.id !== tabId);
    
    closeTab(tabId);
    
    // Navigate after closing
    if (tab?.id === activeTabId) {
      if (remainingTabs.length === 0) {
        // If no tabs remain, store will create Home tab, navigate to home
        navigate('/');
      } else {
        // Find home tab or use previous/first tab
        const homeTab = remainingTabs.find(t => t.id === 'dashboard' || t.path === '/');
        if (homeTab) {
          navigate(homeTab.path);
        } else {
          const tabIndex = tabs.findIndex(t => t.id === tabId);
          const newActiveTab = tabIndex > 0 ? remainingTabs[tabIndex - 1] : remainingTabs[0];
          navigate(newActiveTab.path);
        }
      }
    }
    setConfirmClose(null);
  };

  if (tabs.length === 0) return null;

  return (
    <>
      <div className="relative flex items-center bg-sidebar-background dark:bg-[hsl(220,20%,8%)] border-b border-sidebar-border dark:border-[hsl(220,15%,14%)]">
        {/* Left fade indicator */}
        {showLeftFade && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-sidebar-background dark:from-[hsl(220,20%,8%)] to-transparent z-10 pointer-events-none" />
        )}
        
        {/* Scrollable tabs container with drag-to-scroll */}
        <div 
          ref={scrollContainerRef}
          className={cn(
            "flex items-center overflow-x-auto scrollbar-hide scroll-smooth select-none",
            isScrollDragging && "cursor-grabbing"
          )}
          style={{ scrollBehavior: isScrollDragging ? 'auto' : 'smooth' }}
          onMouseDown={handleScrollMouseDown}
          onMouseMove={handleScrollMouseMove}
          onMouseUp={handleScrollMouseUp}
          onMouseLeave={handleScrollMouseLeave}
        >
          <div className="flex items-center min-w-0 whitespace-nowrap">
            {tabs.map((tab, index) => (
              <ContextMenu key={tab.id}>
                <ContextMenuTrigger>
                  <div
                    data-tab
                    draggable
                    onDragStart={(e) => handleTabDragStart(e, index)}
                    onDragOver={(e) => handleTabDragOver(e, index)}
                    onDragLeave={handleTabDragLeave}
                    onDrop={(e) => handleTabDrop(e, index)}
                    onDragEnd={handleTabDragEnd}
                    onClick={() => handleTabClick(tab)}
                    className={cn(
                      'group relative flex items-center gap-1 px-2.5 py-1.5 text-xs cursor-pointer border-r min-w-[90px] max-w-[160px] transition-all duration-200',
                      tab.isActive
                        ? 'bg-primary/15 dark:bg-[hsl(220,25%,20%)] text-foreground dark:text-white border-r-border dark:border-r-[hsl(220,15%,14%)]'
                        : 'bg-sidebar-background dark:bg-[hsl(220,20%,10%)] text-muted-foreground border-r-border dark:border-r-[hsl(220,15%,14%)] hover:bg-accent dark:hover:bg-[hsl(220,20%,14%)] hover:text-foreground dark:hover:text-[hsl(220,15%,75%)]',
                      draggedTabIndex === index && 'opacity-50',
                      dragOverTabIndex === index && draggedTabIndex !== index && 'border-l-2 border-l-primary'
                    )}
                  >
                    {/* Drag handle - visible on hover */}
                    <GripVertical className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab flex-shrink-0" />
                    
                    {/* Unsaved changes indicator */}
                    {tab.hasUnsavedChanges && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Circle className="h-2 w-2 fill-amber-500 text-amber-500 flex-shrink-0 animate-pulse" />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          Unsaved changes
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <span className="truncate flex-1 font-medium">{tab.label}</span>
                    {tabs.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0',
                          'hover:bg-destructive/20 hover:text-destructive'
                        )}
                        onClick={(e) => handleCloseTab(e, tab.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                    {/* Active tab bottom indicator */}
                    {tab.isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary dark:bg-primary" />
                    )}
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="bg-card dark:bg-[hsl(220,20%,10%)] border-border dark:border-[hsl(220,15%,16%)]">
                  <ContextMenuItem 
                    onClick={() => tab.hasUnsavedChanges ? setConfirmClose(tab.id) : performCloseTab(tab.id)} 
                    disabled={tabs.length === 1}
                  >
                    Close
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => closeOtherTabs(tab.id)} disabled={tabs.length === 1}>
                    Close Others
                  </ContextMenuItem>
                  <ContextMenuItem onClick={closeAllTabs} disabled={tabs.length === 1}>
                    Close All
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        </div>

        {/* Right fade indicator */}
        {showRightFade && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-sidebar-background dark:from-[hsl(220,20%,8%)] to-transparent z-10 pointer-events-none" />
        )}
      </div>

      {/* Confirmation dialog for unsaved changes */}
      <AlertDialog open={!!confirmClose} onOpenChange={() => setConfirmClose(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in this tab. Are you sure you want to close it? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmClose && performCloseTab(confirmClose)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Close Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default WorkspaceTabs;
