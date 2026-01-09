import { useState, useMemo } from 'react';
import { Search, Edit, Trash2, User, X } from 'lucide-react';
import { Button } from '../ui/Button';

/**
 * ClientList Component
 * 
 * Displays a table of clients with search functionality.
 * Features:
 * - Search by name or CPF
 * - Display all client information
 * - Visual badge tags
 * - Edit and Delete actions
 * - Multiple document attachments support
 */
export function ClientList({ clients = [], onEdit, onDelete, loading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedImage, setExpandedImage] = useState(null);

  // Format phone from international format (+5511999998888) to display format (11) 99999-8888
  const formatPhoneDisplay = (phone) => {
    if (!phone) return '-';
    
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Remove country code if present (55)
    const localDigits = digits.startsWith('55') ? digits.slice(2) : digits;
    
    // Apply phone mask
    if (localDigits.length <= 2) return localDigits;
    if (localDigits.length <= 10) {
      // (DD) XXXX-XXXX format
      return `(${localDigits.slice(0, 2)}) ${localDigits.slice(2, 6)}-${localDigits.slice(6, 10)}`;
    }
    // (DD) XXXXX-XXXX format (mobile with 9 digits)
    return `(${localDigits.slice(0, 2)}) ${localDigits.slice(2, 7)}-${localDigits.slice(7, 11)}`;
  };

  // Filter clients based on search term
  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return clients;
    
    const term = searchTerm.toLowerCase();
    return clients.filter(client => 
      client.full_name.toLowerCase().includes(term) ||
      client.cpf.includes(term) ||
      (client.phone && client.phone.toLowerCase().includes(term)) ||
      (client.email && client.email.toLowerCase().includes(term))
    );
  }, [clients, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando clientes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar por nome, CPF, telefone ou e-mail..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500">
            {searchTerm ? 'Nenhum cliente encontrado.' : 'Nenhum cliente ainda. Adicione seu primeiro cliente!'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Foto
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CPF
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Telefone
                </th>
                <th className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  E-mail
                </th>
                <th className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Etiquetas
                </th>
                <th className="hidden xl:table-cell px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reservas
                </th>
                <th className="hidden xl:table-cell px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dias
                </th>
                <th className="hidden xl:table-cell px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Pago
                </th>
                <th className="hidden xl:table-cell px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Média/Noite
                </th>
                <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    {client.profile_picture ? (
                      <img
                        src={client.profile_picture}
                        alt={client.full_name}
                        className="w-10 h-10 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all"
                        onClick={() => setExpandedImage(client.profile_picture)}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {client.full_name}
                    </div>
                    {/* Show CPF on mobile below name */}
                    <div className="md:hidden text-xs text-gray-500 mt-1">
                      {client.cpf}
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {client.cpf}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {formatPhoneDisplay(client.phone)}
                    </div>
                  </td>
                  <td className="hidden lg:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {client.email || '-'}
                    </div>
                  </td>
                  <td className="hidden lg:table-cell px-3 sm:px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {client.tags && client.tags.length > 0 ? (
                        client.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary-100 text-secondary-800"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="hidden xl:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm font-medium text-gray-900">
                      {client.reservations_count !== undefined ? client.reservations_count : '-'}
                    </div>
                  </td>
                  <td className="hidden xl:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-900">
                      {client.total_days_stayed !== undefined ? client.total_days_stayed : '-'}
                    </div>
                  </td>
                  <td className="hidden xl:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-medium text-green-600">
                      {client.total_amount_paid !== undefined ? `R$ ${client.total_amount_paid.toFixed(2)}` : '-'}
                    </div>
                  </td>
                  <td className="hidden xl:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-700">
                      {client.average_price_per_night !== undefined && client.average_price_per_night > 0 ? `R$ ${client.average_price_per_night.toFixed(2)}` : '-'}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-1 sm:gap-2">
                      {/* Show count of document attachments */}
                      {client.document_attachments && client.document_attachments.length > 0 && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded hidden sm:inline">
                          {client.document_attachments.length} doc{client.document_attachments.length > 1 ? 's' : ''}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(client)}
                        className="text-primary-600 hover:text-primary-900 p-1 sm:p-2"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(client)}
                        className="text-red-600 hover:text-red-900 p-1 sm:p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Results Count */}
      {filteredClients.length > 0 && (
        <div className="text-sm text-gray-500 text-right">
          Mostrando {filteredClients.length} de {clients.length} cliente{clients.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Expandable Image Modal */}
      {expandedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={expandedImage}
              alt="Expanded profile"
              className="max-w-full max-h-[90vh] rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
