import React, { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  Search,
  Filter,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  X,
} from "lucide-react";

import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Card, CardContent, CardHeader } from "./card";
import { Input } from "./input";
import { BlurFade } from "./blur-fade";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  searchKey?: string;
  title?: string;
  description?: string;
  loading?: boolean;
  enableSearch?: boolean;
  enableFilters?: boolean;
  enablePagination?: boolean;
  enableColumnVisibility?: boolean;
  pageSize?: number;
  className?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Buscar...",
  searchKey,
  title,
  description,
  loading = false,
  enableSearch = true,
  enableFilters = true,
  enablePagination = true,
  enableColumnVisibility = false,
  pageSize = 10,
  className,
  emptyMessage = "Nenhum resultado encontrado",
  emptyIcon,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, value) => {
      if (!searchKey) {
        return String(row.getValue(columnId))
          .toLowerCase()
          .includes(String(value).toLowerCase());
      }
      return String(row.getValue(searchKey))
        .toLowerCase()
        .includes(String(value).toLowerCase());
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  const LoadingSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: pageSize }).map((_, i) => (
        <BlurFade key={i} delay={i * 0.05}>
          <div className="flex items-center space-x-4 p-4 rounded-lg border border-border">
            {columns.map((_, colIndex) => (
              <div
                key={colIndex}
                className="h-4 bg-muted rounded animate-pulse"
                style={{
                  width: `${Math.random() * 100 + 50}px`,
                  flex: colIndex === 0 ? "1" : "none",
                }}
              />
            ))}
          </div>
        </BlurFade>
      ))}
    </div>
  );

  const EmptyState = () => (
    <BlurFade>
      <div className="flex flex-col items-center justify-center py-12 text-center">
        {emptyIcon || (
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {emptyMessage}
        </h3>
        <p className="text-muted-foreground text-sm max-w-md">
          {globalFilter || columnFilters.length > 0
            ? "Tente ajustar os filtros para encontrar o que procura."
            : "Nenhum dados disponível no momento."}
        </p>
      </div>
    </BlurFade>
  );

  return (
    <Card className={cn("w-full", className)}>
      {(title || description) && (
        <CardHeader>
          <BlurFade>
            <div className="space-y-1.5">
              {title && (
                <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
              )}
              {description && (
                <p className="text-muted-foreground">{description}</p>
              )}
            </div>
          </BlurFade>
        </CardHeader>
      )}

      <CardContent className="space-y-4">
        {/* Toolbar */}
        {(enableSearch || enableFilters || enableColumnVisibility) && (
          <BlurFade delay={0.1}>
            <div className="flex items-center justify-between space-x-2">
              <div className="flex items-center space-x-2 flex-1">
                {enableSearch && (
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={searchPlaceholder}
                      value={globalFilter}
                      onChange={(e) => setGlobalFilter(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                )}

                {enableFilters && columnFilters.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setColumnFilters([])}
                    className="h-8 px-2 lg:px-3"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Limpar Filtros
                  </Button>
                )}
              </div>

              {enableColumnVisibility && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto h-8"
                  >
                    <EyeOff className="w-4 h-4 mr-2" />
                    Colunas
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          </BlurFade>
        )}

        {/* Table */}
        <BlurFade delay={0.2}>
          <div className="rounded-md border border-border overflow-hidden">
            {loading ? (
              <div className="p-4">
                <LoadingSkeleton />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="bg-background divide-y divide-border">
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row, index) => (
                        <BlurFade key={row.id} delay={index * 0.05}>
                          <tr
                            data-state={row.getIsSelected() && "selected"}
                            className="hover:bg-muted/30 transition-colors duration-200"
                          >
                            {row.getVisibleCells().map((cell) => (
                              <td
                                key={cell.id}
                                className="px-6 py-4 whitespace-nowrap text-sm text-foreground"
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </td>
                            ))}
                          </tr>
                        </BlurFade>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={columns.length}
                          className="h-24 text-center"
                        >
                          <EmptyState />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </BlurFade>

        {/* Pagination */}
        {enablePagination && !loading && table.getRowModel().rows?.length > 0 && (
          <BlurFade delay={0.3}>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Mostrando {table.getState().pagination.pageIndex * pageSize + 1} a{" "}
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * pageSize,
                  table.getFilteredRowModel().rows.length
                )}{" "}
                de {table.getFilteredRowModel().rows.length} resultados
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="h-8 px-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: table.getPageCount() }, (_, i) => i)
                    .filter((page) => {
                      const current = table.getState().pagination.pageIndex;
                      return Math.abs(page - current) <= 2;
                    })
                    .map((page) => (
                      <Button
                        key={page}
                        variant={
                          page === table.getState().pagination.pageIndex
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => table.setPageIndex(page)}
                        className="h-8 w-8 p-0"
                      >
                        {page + 1}
                      </Button>
                    ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="h-8 px-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </BlurFade>
        )}
      </CardContent>
    </Card>
  );
}

export default DataTable; 