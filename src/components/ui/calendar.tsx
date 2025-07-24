import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarProps {
  mode: 'single' | 'multiple' | 'range';
  selected?: Date | Date[] | undefined;
  onSelect?: (date: Date | undefined) => void;
  className?: string;
  locale?: any;
  disabled?: (date: Date) => boolean;
}

export const Calendar: React.FC<CalendarProps> = ({
  mode = 'single',
  selected,
  onSelect,
  className = '',
  locale,
  disabled
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
          className={`
            w-9 h-9 rounded-md text-sm font-medium transition-colors
            ${isToday ? 'bg-blue-100 text-blue-900' : ''}
            ${isSelected ? 'bg-blue-600 text-white' : 'text-gray-900 hover:bg-gray-100'}
            ${isDisabled ? 'text-gray-400 cursor-not-allowed' : 'cursor-pointer'}
            disabled:pointer-events-none disabled:opacity-50
          `}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <div className={`p-3 ${className}`}>
      {/* Header com navegação */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          className="p-1 rounded-md hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        <h2 className="text-sm font-semibold">
          {monthNames[currentMonth]} {currentYear}
        </h2>
        
        <button
          onClick={goToNextMonth}
          className="p-1 rounded-md hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 mb-2">
        {dayNames.map(day => (
          <div
            key={day}
            className="w-9 h-9 text-xs font-medium text-gray-500 flex items-center justify-center"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid de dias */}
      <div className="grid grid-cols-7 gap-1">
        {renderDays()}
      </div>
    </div>
  );
};