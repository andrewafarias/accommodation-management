import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Calendar as CalendarIcon } from 'lucide-react';

export function Calendar() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarIcon className="w-6 h-6 mr-2" />
            Gantt Calendar View
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-center">
              <CalendarIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-600">
                Calendar view coming soon
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This will display a Gantt-style calendar with reservations
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
