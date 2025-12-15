import { useState, useEffect } from 'react';
import { X, Edit2, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { format } from 'date-fns';

/**
 * TransactionDetailsModal Component
 * 
 * Modal for viewing and editing transaction details.
 */
export function TransactionDetailsModal({ 
  isOpen, 
  onClose, 
  transaction,
  onUpdate,
  onMarkAsPaid
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (transaction) {
      setFormData({
        transaction_type: transaction.transaction_type || 'EXPENSE',
        category: transaction.category || 'OTHER',
        amount: transaction.amount || '',
        payment_method: transaction.payment_method || 'PIX',
        due_date: transaction.due_date || '',
        paid_date: transaction.paid_date || '',
        description: transaction.description || '',
        notes: transaction.notes || '',
      });
      setIsEditing(false);
      setError(null);
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      await onUpdate(transaction.id, formData);
      setIsEditing(false);
    } catch {
      setError('Erro ao atualizar transação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async () => {
    await onMarkAsPaid(transaction.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Detalhes da Transação #{transaction.id}
          </h2>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 className="w-4 h-4 mr-1" />
                Editar
              </Button>
            ) : (
              <Button variant="default" size="sm" onClick={handleSave} disabled={loading}>
                <Save className="w-4 h-4 mr-1" />
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Transaction Type and Status */}
          <div className="flex items-center justify-between">
            <div>
              {isEditing ? (
                <select
                  name="transaction_type"
                  value={formData.transaction_type}
                  onChange={handleChange}
                  className="text-lg font-semibold px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="INCOME">Receita</option>
                  <option value="EXPENSE">Despesa</option>
                </select>
              ) : (
                <span className={`text-lg font-semibold ${
                  transaction.transaction_type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.transaction_type === 'INCOME' ? 'Receita' : 'Despesa'}
                </span>
              )}
            </div>
            <div>
              {transaction.is_paid ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  ✓ Pago em {formatDate(transaction.paid_date)}
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    Pendente
                  </span>
                  <Button variant="outline" size="sm" onClick={handleMarkAsPaid}>
                    Marcar como Pago
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="text-center py-4 bg-gray-50 rounded-lg">
            {isEditing ? (
              <div className="flex items-center justify-center gap-2">
                <span className="text-gray-600">R$</span>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="text-3xl font-bold w-48 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <span className={`text-3xl font-bold ${
                transaction.transaction_type === 'INCOME' ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(transaction.amount)}
              </span>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Categoria</label>
              {isEditing ? (
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="LODGING">Hospedagem</option>
                  <option value="MAINTENANCE">Manutenção</option>
                  <option value="UTILITIES">Utilidades</option>
                  <option value="SUPPLIES">Suprimentos</option>
                  <option value="SALARY">Salário</option>
                  <option value="OTHER">Outro</option>
                </select>
              ) : (
                <p className="text-gray-900 font-medium">{getCategoryLabel(transaction.category)}</p>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Método de Pagamento</label>
              {isEditing ? (
                <select
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PIX">Pix</option>
                  <option value="CREDIT_CARD">Cartão de Crédito</option>
                  <option value="DEBIT_CARD">Cartão de Débito</option>
                  <option value="CASH">Dinheiro</option>
                  <option value="BANK_TRANSFER">Transferência Bancária</option>
                </select>
              ) : (
                <p className="text-gray-900 font-medium">{getPaymentMethodLabel(transaction.payment_method)}</p>
              )}
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Data de Vencimento</label>
              {isEditing ? (
                <input
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900 font-medium">{formatDate(transaction.due_date)}</p>
              )}
            </div>

            {/* Paid Date */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Data de Pagamento</label>
              {isEditing ? (
                <input
                  type="date"
                  name="paid_date"
                  value={formData.paid_date || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900 font-medium">{transaction.paid_date ? formatDate(transaction.paid_date) : 'Não pago'}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Descrição</label>
            {isEditing ? (
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Descrição da transação..."
              />
            ) : (
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                {transaction.description || 'Sem descrição'}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Notas Adicionais</label>
            {isEditing ? (
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Notas adicionais..."
              />
            ) : (
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                {transaction.notes || 'Sem notas'}
              </p>
            )}
          </div>

          {/* Metadata */}
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-sm text-gray-500">
              <div>
                <span className="font-medium">Criado em:</span>
                <p>{formatDate(transaction.created_at)}</p>
              </div>
              <div>
                <span className="font-medium">Atualizado em:</span>
                <p>{formatDate(transaction.updated_at)}</p>
              </div>
              <div>
                <span className="font-medium">Reserva Vinculada:</span>
                <p>{transaction.reservation ? `#${transaction.reservation}` : 'Nenhuma'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2">
          {isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(false)} disabled={loading}>
              Cancelar
            </Button>
          )}
          <Button onClick={onClose} variant="outline">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
