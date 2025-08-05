import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CalendarProps {
  mode: 'single' | 'multiple' | 'range';
  selected?: Date | Date[] | undefined;
  onSelect?: (date: Date | undefined) => void;
  className?: string;
  locale?: any;
  disabled?: (date: Date) => boolean;
  // Novas props para melhor UX
  showToday?: boolean;
  showWeekdays?: boolean;
}

export const Calendar: React.FC<CalendarProps> = ({
  mode = 'single',
  selected,
  onSelect,
  className = '',
  locale,
  disabled,
  showToday = true,
  showWeekdays = true
}) => {
  const [currentDate, setCurrentDate] = React.useState(new Date());

  const today = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Obter primeiro dia do mês e quantos dias tem
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Nomes dos meses
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Dias da semana
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Navegar entre meses
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Verificar se uma data está selecionada
  const isDateSelected = (date: Date) => {
    if (mode === 'single' && selected instanceof Date) {
      return date.toDateString() === selected.toDateString();
    }
    return false;
  };

  // Handle click na data
  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentYear, currentMonth, day);
    
    if (disabled && disabled(clickedDate)) {
      return;
    }

    if (onSelect) {
      onSelect(clickedDate);
    }
  };

  // Renderizar os dias
  const renderDays = () => {
    const days = [];

    // Espaços vazios para o início do mês
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="w-9 h-9" />
      );
    }

    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = isDateSelected(date);
      const isDisabled = disabled && disabled(date);

      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(day)}
          disabled={isDisabled}
          className={cn(
            // Base class + Magic UI inspired
            "day-button",
            isToday && !isSelected && "today",
            isSelected && "selected",
            
            // Base styles - Magic UI inspired com !important
            "!relative !w-9 !h-9 !rounded-lg !text-sm !font-medium !transition-all !duration-200",
            "!flex !items-center !justify-center",
            "focus:!outline-none focus:!ring-2 focus:!ring-blue-500 focus:!ring-offset-1",
            
            // Default state com !important
            "!text-gray-900 hover:!bg-gradient-to-r hover:!from-blue-50 hover:!to-indigo-50",
            "hover:!text-blue-700 hover:!shadow-sm hover:!scale-105",
            
            // Today indicator
            isToday && !isSelected && [
              "!bg-gradient-to-r !from-blue-50 !to-indigo-50",
              "!text-blue-700 !font-semibold",
              "!ring-1 !ring-blue-200"
            ],
            
            // Selected state - Magic UI gradient
            isSelected && [
              "!bg-gradient-to-r !from-blue-600 !to-indigo-600",
              "!text-white !shadow-lg !shadow-blue-500/25",
              "!scale-105 !ring-2 !ring-blue-300"
            ],
            
            // Disabled state
            isDisabled && [
              "!text-gray-300 !cursor-not-allowed",
              "hover:!bg-transparent hover:!text-gray-300",
              "hover:!scale-100 hover:!shadow-none"
            ],
            
            // Interactive states
            !isDisabled && "!cursor-pointer active:!scale-95",
            
            // Magic UI shine effect on hover
            !isDisabled && !isSelected && [
              "before:!absolute before:!inset-0 before:!rounded-lg",
              "before:!bg-gradient-to-r before:!from-transparent before:!via-white/10 before:!to-transparent",
              "before:!translate-x-[-100%] hover:before:!translate-x-[100%]",
              "before:!transition-transform before:!duration-1000",  
              "!overflow-hidden"
            ]
          )}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <div className={cn(
      // Base container com especificidade aumentada
      "!p-4 !bg-white !rounded-xl !shadow-lg !border !border-gray-200",
      "!backdrop-blur-sm !bg-white/95 !relative !z-10",
      "magic-ui-calendar", // Classe específica para evitar conflitos
      className
    )}>
      {/* Header com navegação - Magic UI style com !important */}
      <div className="!flex !items-center !justify-between !mb-6">
        <button
          onClick={goToPreviousMonth}
          data-nav="prev"
          className={cn(
            "!p-2 !rounded-lg !transition-all !duration-200",
            "hover:!bg-gradient-to-r hover:!from-gray-50 hover:!to-gray-100",
            "hover:!shadow-sm hover:!scale-105 active:!scale-95",
            "focus:!outline-none focus:!ring-2 focus:!ring-blue-500 focus:!ring-offset-1",
            "!group !cursor-pointer"
          )}
        >
          <ChevronLeft className="!w-4 !h-4 !text-gray-600 group-hover:!text-gray-800 !transition-colors" />
        </button>
        
        <div className="!text-center">
          <h2 className={cn(
            "!text-lg !font-semibold !bg-gradient-to-r !from-gray-800 !to-gray-600",
            "!bg-clip-text !text-transparent",
            "!flex !items-center !gap-2 !justify-center"
          )}>
            <CalendarIcon className="!w-4 !h-4 !text-gray-600" />
            {monthNames[currentMonth]} {currentYear}
          </h2>
        </div>
        
        <button
          onClick={goToNextMonth}
          data-nav="next"
          className={cn(
            "!p-2 !rounded-lg !transition-all !duration-200",
            "hover:!bg-gradient-to-r hover:!from-gray-50 hover:!to-gray-100",
            "hover:!shadow-sm hover:!scale-105 active:!scale-95",
            "focus:!outline-none focus:!ring-2 focus:!ring-blue-500 focus:!ring-offset-1",
            "!group !cursor-pointer"
          )}
        >
          <ChevronRight className="!w-4 !h-4 !text-gray-600 group-hover:!text-gray-800 !transition-colors" />
        </button>
      </div>

      {/* Dias da semana - Magic UI style com !important */}
      {showWeekdays && (
        <div className="weekdays !grid !grid-cols-7 !mb-3">
          {dayNames.map(day => (
            <div
              key={day}
              className={cn(
                "weekday",
                "!w-9 !h-8 !text-xs !font-semibold",
                "!bg-gradient-to-r !from-gray-500 !to-gray-600 !bg-clip-text !text-transparent",
                "!flex !items-center !justify-center",
                "!border-b !border-gray-100 !pb-2"
              )}
            >
              {day}
            </div>
          ))}
        </div>
      )}

      {/* Grid de dias - com melhor spacing e !important */}
      <div className="days-grid !grid !grid-cols-7 !gap-1.5">
        {renderDays()}
      </div>
    </div>
  );
};