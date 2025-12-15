from django.db import models


class Client(models.Model):
    """
    Client model for managing guest information.
    Unique identifier is CPF (Brazilian individual taxpayer registry).
    """
    full_name = models.CharField(max_length=255, verbose_name="Full Name")
    cpf = models.CharField(
        max_length=14,
        unique=True,
        verbose_name="CPF",
        help_text="Format: XXX.XXX.XXX-XX"
    )
    phone = models.CharField(
        max_length=20,
        verbose_name="Phone",
        help_text="Format: +55 (XX) XXXXX-XXXX"
    )
    email = models.EmailField(blank=True, null=True, verbose_name="Email")
    address = models.TextField(blank=True, null=True, verbose_name="Address")
    notes = models.TextField(blank=True, null=True, verbose_name="Notes")
    tags = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Tags",
        help_text="List of tags like 'VIP', 'Frequent Guest', etc."
    )
    profile_picture = models.ImageField(
        upload_to='clients/photos/',
        blank=True,
        null=True,
        verbose_name="Profile Picture"
    )
    document_file = models.FileField(
        upload_to='clients/docs/',
        blank=True,
        null=True,
        verbose_name="Document File"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Client"
        verbose_name_plural = "Clients"
        ordering = ['full_name']
    
    def __str__(self):
        return f"{self.full_name} (CPF: {self.cpf})"


class DocumentAttachment(models.Model):
    """
    Model for storing multiple document attachments for a client.
    """
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='document_attachments',
        verbose_name="Client"
    )
    file = models.FileField(
        upload_to='clients/docs/',
        verbose_name="Document File"
    )
    filename = models.CharField(
        max_length=255,
        verbose_name="Filename",
        help_text="Original filename of the uploaded document"
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Document Attachment"
        verbose_name_plural = "Document Attachments"
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.filename} - {self.client.full_name}"

