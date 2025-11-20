import { Calendar } from 'lucide-react';
import { subMonths, subYears, startOfYear } from 'date-fns';

export function PeriodSelector({ onPeriodChange }) {
  const periods = [
    { label: '1 Mês', value: '1M' },
    { label: '3 Meses', value: '3M' },
    { label: '6 Meses', value: '6M' },
    { label: '1 Ano', value: '1Y' },
    { label: 'Total', value: 'ALL' },
  ];

  const handlePeriodClick = (value) => {
    const today = new Date();
    let startDate;
    let endDate = today;

    switch (value) {
      case '1M':
        startDate = subMonths(today, 1);
        break;
      case '3M':
        startDate = subMonths(today, 3);
        break;
      case '6M':
        startDate = subMonths(today, 6);
        break;
      case '1Y':
        startDate = subYears(today, 1);
        break;
      case 'ALL':
        startDate = startOfYear(subYears(today, 10)); // Last 10 years
        break;
      default:
        startDate = subMonths(today, 6);
    }

    onPeriodChange(startDate, endDate);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Calendar className="w-4 h-4 text-gray-500" />
      <span className="text-sm font-medium text-gray-700">Período:</span>
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => handlePeriodClick(period.value)}
          className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-colors"
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
