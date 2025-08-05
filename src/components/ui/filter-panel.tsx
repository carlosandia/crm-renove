import * as React from "react"
import { cn } from "../../lib/utils"
import { Card, CardContent } from "./card"
import { Button } from "./button"
import { Input } from "./input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { X, Filter, Search } from "lucide-react"

export interface FilterOption {
  key: string
  label: string
  type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange'
  options?: { value: string; label: string }[]
  placeholder?: string
  value?: any
  onChange?: (value: any) => void
}

export interface FilterPanelProps {
  filters: FilterOption[]
  onFiltersChange?: (filters: { [key: string]: any }) => void
  onReset?: () => void
  searchTerm?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  showSearch?: boolean
  className?: string
  collapsible?: boolean
  defaultOpen?: boolean
}

const FilterPanel = React.forwardRef<
  HTMLDivElement,
  FilterPanelProps
>(({ 
  filters,
  onFiltersChange,
  onReset,
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  showSearch = true,
  className,
  collapsible = false,
  defaultOpen = true,
  ...props 
}, ref) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)
  const [filterValues, setFilterValues] = React.useState<{ [key: string]: any }>({})

  // Atualiza os valores dos filtros quando mudarem externamente
  React.useEffect(() => {
    const initialValues: { [key: string]: any } = {}
    filters.forEach(filter => {
      if (filter.value !== undefined) {
        initialValues[filter.key] = filter.value
      }
    })
    setFilterValues(initialValues)
  }, [filters])

  const handleFilterChange = (key: string, value: any) => {
    const newValues = { ...filterValues, [key]: value }
    setFilterValues(newValues)
    
    // Chama o onChange do filtro específico se existir
    const filter = filters.find(f => f.key === key)
    if (filter?.onChange) {
      filter.onChange(value)
    }
    
    // Chama o onChange geral se existir
    if (onFiltersChange) {
      onFiltersChange(newValues)
    }
  }

  const handleReset = () => {
    const resetValues: { [key: string]: any } = {}
    filters.forEach(filter => {
      resetValues[filter.key] = ''
    })
    setFilterValues(resetValues)
    
    if (onReset) {
      onReset()
    } else if (onFiltersChange) {
      onFiltersChange(resetValues)
    }
  }

  const hasActiveFilters = Object.values(filterValues).some(value => 
    value !== undefined && value !== null && value !== ''
  ) || (searchTerm && searchTerm.length > 0)

  const renderFilter = (filter: FilterOption) => {
    const value = filterValues[filter.key] || filter.value || ''

    switch (filter.type) {
      case 'text':
        return (
          <Input
            placeholder={filter.placeholder}
            value={value}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            className="h-9"
          />
        )

      case 'select':
        return (
          <Select 
            value={value} 
            onValueChange={(val) => handleFilterChange(filter.key, val)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={filter.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {filter.options?.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            className="h-9"
          />
        )

      default:
        return null
    }
  }

  const FilterContent = () => (
    <CardContent className="p-4">
      <div className="space-y-4">
        {/* Busca */}
        {showSearch && onSearchChange && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
        )}

        {/* Filtros */}
        {filters.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filters.map(filter => (
              <div key={filter.key} className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {filter.label}
                </label>
                {renderFilter(filter)}
              </div>
            ))}
          </div>
        )}

        {/* Reset button */}
        {hasActiveFilters && (
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-8 text-xs"
            >
              <X className="w-3 h-3 mr-1" />
              Limpar Filtros
            </Button>
          </div>
        )}
      </div>
    </CardContent>
  )

  if (!collapsible) {
    return (
      <Card ref={ref} className={cn("mb-6", className)} {...props}>
        <FilterContent />
      </Card>
    )
  }

  return (
    <Card ref={ref} className={cn("mb-6", className)} {...props}>
      <div
        className="p-4 cursor-pointer flex items-center justify-between border-b border-border"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-foreground">Filtros</span>
          {hasActiveFilters && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
              {Object.values(filterValues).filter(v => v !== undefined && v !== null && v !== '').length} ativo(s)
            </span>
          )}
        </div>
        <div className={cn(
          "transform transition-transform",
          isOpen ? "rotate-180" : "rotate-0"
        )}>
          ⌄
        </div>
      </div>
      
      {isOpen && <FilterContent />}
    </Card>
  )
})

FilterPanel.displayName = "FilterPanel"

export { FilterPanel } 