import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from 'lucide-react';
import type { PaginationState } from '@/hooks/usePaginatedQuery';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface PaginatedDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onRowClick?: (item: T) => void;
  className?: string;
  emptyMessage?: string;
  pageSizeOptions?: number[];
}

export function PaginatedDataTable<T extends { id: string | number }>({
  columns,
  data,
  isLoading = false,
  pagination,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  className,
  emptyMessage = 'No data available',
  pageSizeOptions = [10, 25, 50, 100],
}: PaginatedDataTableProps<T>) {
  const { page, pageSize, totalCount, totalPages } = pagination;

  const startRecord = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, totalCount);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Table */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50">
              {columns.map((column) => (
                <TableHead
                  key={String(column.key)}
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wider text-muted-foreground h-12",
                    column.className
                  )}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    "border-border/50 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-accent/50",
                    index % 2 === 0 && "bg-muted/20"
                  )}
                >
                  {columns.map((column) => (
                    <TableCell key={String(column.key)} className={cn("py-4", column.className)}>
                      {column.render
                        ? column.render(item)
                        : String(item[column.key as keyof T] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2">
        {/* Info */}
        <div className="text-sm text-muted-foreground">
          {totalCount > 0 ? (
            <>
              Showing <span className="font-medium">{startRecord}</span> to{' '}
              <span className="font-medium">{endRecord}</span> of{' '}
              <span className="font-medium">{totalCount.toLocaleString()}</span> results
            </>
          ) : (
            'No results'
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Page Size Selector */}
          {onPageSizeChange && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => onPageSizeChange(Number(value))}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Page Navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(1)}
              disabled={page <= 1 || isLoading}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page indicator */}
            <span className="px-3 text-sm text-muted-foreground">
              Page <span className="font-medium">{page}</span> of{' '}
              <span className="font-medium">{totalPages || 1}</span>
            </span>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(totalPages)}
              disabled={page >= totalPages || isLoading}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaginatedDataTable;
