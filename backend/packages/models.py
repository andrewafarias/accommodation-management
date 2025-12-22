from django.db import models
from django.core.exceptions import ValidationError
from accommodations.models import AccommodationUnit


class Package(models.Model):
    """
    Modelo de Pacote para agrupar múltiplas unidades de acomodação.
    Permite criar ofertas especiais com múltiplas unidades a um preço de pacote.
    """
    
    name = models.CharField(
        max_length=200,
        unique=True,
        verbose_name="Nome do Pacote"
    )
    description = models.TextField(
        blank=True,
        verbose_name="Descrição",
        help_text="Descrição detalhada do pacote"
    )
    accommodation_units = models.ManyToManyField(
        AccommodationUnit,
        related_name='packages',
        verbose_name="Unidades de Acomodação",
        help_text="Unidades incluídas neste pacote"
    )
    package_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Preço do Pacote (BRL)",
        help_text="Preço total do pacote em Reais"
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Ativo",
        help_text="Pacote disponível para reserva"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Pacote"
        verbose_name_plural = "Pacotes"
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    def clean(self):
        """Validação customizada do modelo."""
        super().clean()
        
        # Validar que o pacote tem pelo menos uma unidade
        if self.pk and self.accommodation_units.count() == 0:
            raise ValidationError({
                'accommodation_units': 'O pacote deve ter pelo menos uma unidade de acomodação.'
            })
    
    @property
    def unit_count(self):
        """Retorna o número de unidades no pacote."""
        return self.accommodation_units.count()
    
    @property
    def total_capacity(self):
        """Retorna a capacidade total de todas as unidades do pacote."""
        return sum(unit.max_capacity for unit in self.accommodation_units.all())
