import { format } from 'date-fns';
import { Button } from '../ui/Button';
import { CheckCircle } from 'lucide-react';

export function TransactionTable({ transactions, onMarkAsPaid }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      PIX: 'Pix',
      CREDIT_CARD: 'Cartão de Crédito',
      DEBIT_CARD: 'Cartão de Débito',
      CASH: 'Dinheiro',
      BANK_TRANSFER: 'Transferência',
    };
    return labels[method] || method;
  };

  const getCategoryLabel = (category) => {
    const labels = {
      LODGING: 'Hospedagem',
      MAINTENANCE: 'Manutenção',
      UTILITIES: 'Utilidades',
      SUPPLIES: 'Suprimentos',
      SALARY: 'Salário',
      OTHER: 'Outro',
    };
    return labels[category] || category;
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Nenhuma transação encontrada.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Data
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tipo
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Categoria
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Valor
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Método de Pagamento
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatDate(transaction.due_date)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <span
                  className={
                    transaction.transaction_type === 'INCOME'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }
                >
                  {transaction.transaction_type === 'INCOME' ? 'Receita' : 'Despesa'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {getCategoryLabel(transaction.category)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {formatCurrency(transaction.amount)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {getPaymentMethodLabel(transaction.payment_method)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {transaction.is_paid ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Pago ({formatDate(transaction.paid_date)})
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pendente
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {!transaction.is_paid && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMarkAsPaid(transaction.id)}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Marcar como Pago
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
