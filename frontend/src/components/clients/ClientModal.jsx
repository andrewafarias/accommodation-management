import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';

/**
 * ClientModal Component
 * 
 * Modal form for adding or editing a client.
 * Features:
 * - CPF mask (XXX.XXX.XXX-XX)
 * - Form validation
 * - Tag management
 * - Address and notes fields
 */
export function ClientModal({ isOpen, onClose, onSave, client, existingCpfs = [] }) {
  const [formData, setFormData] = useState({
    full_name: '',
    cpf: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    tags: [],
    profile_picture: null,
    document_file: null,
  });
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Initialize form with client data when editing
  useEffect(() => {
    if (client) {
      setFormData({
        full_name: client.full_name || '',
        cpf: client.cpf || '',
        phone: client.phone || '',
        email: client.email || '',
        address: client.address || '',
        notes: client.notes || '',
        tags: client.tags || [],
        profile_picture: null,
        document_file: null,
      });
      setPreviewImage(client.profile_picture || null);
    } else {
      setFormData({
        full_name: '',
        cpf: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
        tags: [],
        profile_picture: null,
        document_file: null,
      });
      setPreviewImage(null);
    }
    setErrors({});
  }, [client, isOpen]);

  // Format CPF as user types (XXX.XXX.XXX-XX)
  const formatCPF = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Apply CPF mask
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  };

  // Validate CPF format
  const isValidCPF = (cpf) => {
    const digits = cpf.replace(/\D/g, '');
    return digits.length === 11;
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'cpf') {
      const formatted = formatCPF(value);
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle file changes
  const handleFileChange = (e) => {
    const { name, files } = e.target;
    
    if (files && files[0]) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
      
      // Create preview for profile picture
      if (name === 'profile_picture') {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewImage(reader.result);
        };
        reader.readAsDataURL(files[0]);
      }
    }
  };

  // Add tag
  const handleAddTag = (e) => {
    e.preventDefault();
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (!formData.cpf.trim()) {
      newErrors.cpf = 'CPF is required';
    } else if (!isValidCPF(formData.cpf)) {
      newErrors.cpf = 'CPF must be 11 digits';
    } else {
      // Check if CPF is unique (exclude current client when editing)
      const cpfExists = existingCpfs.some(
        existingCpf => existingCpf === formData.cpf && (!client || client.cpf !== formData.cpf)
      );
      if (cpfExists) {
        newErrors.cpf = 'CPF already exists';
      }
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setSaving(true);
    try {
      // Convert to FormData for file upload support
      const submitData = new FormData();
      
      // Append all text fields
      submitData.append('full_name', formData.full_name);
      submitData.append('cpf', formData.cpf);
      submitData.append('phone', formData.phone);
      if (formData.email) submitData.append('email', formData.email);
      if (formData.address) submitData.append('address', formData.address);
      if (formData.notes) submitData.append('notes', formData.notes);
      submitData.append('tags', JSON.stringify(formData.tags));
      
      // Append files if they exist
      if (formData.profile_picture) {
        submitData.append('profile_picture', formData.profile_picture);
      }
      if (formData.document_file) {
        submitData.append('document_file', formData.document_file);
      }
      
      await onSave(submitData);
      onClose();
    } catch (error) {
      console.error('Error saving client:', error);
      setErrors({ submit: 'Failed to save client. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">
              {client ? 'Edit Client' : 'New Client'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.full_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter full name"
              />
              {errors.full_name && (
                <p className="mt-1 text-sm text-red-500">{errors.full_name}</p>
              )}
            </div>

            {/* CPF */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CPF <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="cpf"
                value={formData.cpf}
                onChange={handleChange}
                maxLength={14}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.cpf ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="XXX.XXX.XXX-XX"
              />
              {errors.cpf && (
                <p className="mt-1 text-sm text-red-500">{errors.cpf}</p>
              )}
            </div>

            {/* Phone and Email - Side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="+55 (XX) XXXXX-XXXX"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="email@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter address"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="space-y-2">
                {/* Tag Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddTag(e);
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add a tag (e.g., VIP, Frequent Guest)"
                  />
                  <Button
                    type="button"
                    onClick={handleAddTag}
                    variant="outline"
                    size="default"
                  >
                    Add
                  </Button>
                </div>

                {/* Tag List */}
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Profile Picture */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Profile Picture
              </label>
              <div className="space-y-2">
                {previewImage && (
                  <div className="flex items-center space-x-3">
                    <img
                      src={previewImage}
                      alt="Profile preview"
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-300"
                    />
                  </div>
                )}
                <input
                  type="file"
                  name="profile_picture"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              </div>
            </div>

            {/* Document File */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document Attachment
              </label>
              <input
                type="file"
                name="document_file"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
              {formData.document_file && (
                <p className="mt-1 text-sm text-gray-600">
                  Selected: {formData.document_file.name}
                </p>
              )}
              {!formData.document_file && client?.document_file && (
                <p className="mt-1 text-sm text-gray-600">
                  Current file attached
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional notes about the client"
              />
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
              >
                {saving ? 'Saving...' : (client ? 'Update Client' : 'Create Client')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
