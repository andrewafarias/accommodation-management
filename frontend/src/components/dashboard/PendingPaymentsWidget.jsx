import { AlertCircle, DollarSign } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { format, parseISO, isPast, differenceInDays } from 'date-fns';

export function PendingPaymentsWidget({ transactions }) {
  // Filter transactions that are not paid (paid_date is null)
  const pendingPayments = transactions
    .filter(transaction => !transaction.paid_date)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  const calculateDaysOverdue = (dueDate) => {
    const due = parseISO(dueDate);
    const today = new Date();
    
    if (isPast(due)) {
      return differenceInDays(today, due);
    }
    return 0;
  };

  const getStatusColor = (dueDate) => {
    const daysOverdue = calculateDaysOverdue(dueDate);
    
    if (daysOverdue > 0) {
      return 'bg-red-50 border-red-300';
    }
    
    const daysUntilDue = differenceInDays(parseISO(dueDate), new Date());
    if (daysUntilDue <= 3) {
      return 'bg-yellow-50 border-yellow-300';
    }
    
    return 'bg-blue-50 border-blue-300';
  };

  const getTextColor = (dueDate) => {
    const daysOverdue = calculateDaysOverdue(dueDate);
    
    if (daysOverdue > 0) {
      return 'text-red-700';
    }
    
    const daysUntilDue = differenceInDays(parseISO(dueDate), new Date());
    if (daysUntilDue <= 3) {
      return 'text-yellow-700';
    }
    
    return 'text-blue-700';
  };

  const totalPending = pendingPayments.reduce(
    (sum, transaction) => sum + parseFloat(transaction.amount),
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-yellow-700">
          <AlertCircle className="w-5 h-5 mr-2" />
          Pagamentos Pendentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingPayments.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum pagamento pendente! 🎉</p>
        ) : (
          <div className="space-y-3">
            {pendingPayments.slice(0, 5).map(transaction => {
              const daysOverdue = calculateDaysOverdue(transaction.due_date);
              
              return (
                <div
                  key={transaction.id}
                  className={`p-3 border rounded-md ${getStatusColor(transaction.due_date)}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {transaction.description || transaction.category || 'Transação'}
                      </p>
                      {transaction.reservation && transaction.reservation.client && (
                        <p className="text-sm text-gray-600">
                          {transaction.reservation.client.full_name}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-gray-500">Vencimento:</span>
                        <span className={`text-xs font-medium ${getTextColor(transaction.due_date)}`}>
                          {format(parseISO(transaction.due_date), 'dd/MM/yyyy')}
                        </span>
                        {daysOverdue > 0 && (
                          <span className="text-xs font-semibold text-red-600 ml-1">
                            ({daysOverdue} {daysOverdue === 1 ? 'dia' : 'dias'} atrasado)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-gray-500" />
                        <p className={`font-bold text-lg ${getTextColor(transaction.due_date)}`}>
                          R$ {parseFloat(transaction.amount).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {transaction.get_transaction_type_display || transaction.transaction_type}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {pendingPayments.length > 5 && (
              <p className="text-xs text-gray-500 italic text-center">
                +{pendingPayments.length - 5} mais...
              </p>
            )}
            <div className="pt-3 border-t border-gray-300">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Total Pendente:</span>
                <span className="text-lg font-bold text-yellow-700">
                  R$ {totalPending.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
