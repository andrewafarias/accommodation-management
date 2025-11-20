import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ClientList } from '../components/clients/ClientList';
import { ClientModal } from '../components/clients/ClientModal';
import { Users, Plus } from 'lucide-react';
import api from '../services/api';

export function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  // Fetch clients on mount
  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await api.get('clients/');
      const clientsData = response.data.results || response.data;
      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle opening modal for new client
  const handleNewClient = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  // Handle opening modal for editing
  const handleEdit = (client) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  // Handle saving client (create or update)
  const handleSave = async (clientData) => {
    try {
      if (editingClient) {
        // Update existing client
        await api.put(`clients/${editingClient.id}/`, clientData);
      } else {
        // Create new client
        await api.post('clients/', clientData);
      }
      // Refresh the list
      await fetchClients();
    } catch (error) {
      console.error('Error saving client:', error);
      throw error;
    }
  };

  // Handle delete
  const handleDelete = async (client) => {
    if (!window.confirm(`Are you sure you want to delete ${client.full_name}?`)) {
      return;
    }

    try {
      await api.delete(`clients/${client.id}/`);
      // Refresh the list
      await fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client. Please try again.');
    }
  };

  // Get existing CPFs for validation
  const existingCpfs = clients.map(c => c.cpf);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
        <Button onClick={handleNewClient}>
          <Plus className="w-5 h-5 mr-2" />
          New Client
        </Button>
      </div>

      {/* Client List Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-6 h-6 mr-2" />
            Client Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClientList
            clients={clients}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loading}
          />
        </CardContent>
      </Card>

      {/* Client Modal */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        client={editingClient}
        existingCpfs={existingCpfs}
      />
    </div>
  );
}
