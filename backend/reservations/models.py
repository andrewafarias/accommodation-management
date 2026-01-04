from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone


class Reservation(models.Model):
    """
    Modelo de Reserva para gerenciar reservas.
    CRÍTICO: Inclui validação de sobreposição para prevenir reservas duplicadas.
    """
    
    # Opções de status
    PENDING = 'PENDING'
    CONFIRMED = 'CONFIRMED'
    CHECKED_IN = 'CHECKED_IN'
    CHECKED_OUT = 'CHECKED_OUT'
    CANCELLED = 'CANCELLED'
    
    STATUS_CHOICES = [
        (PENDING, 'Pendente'),
        (CONFIRMED, 'Confirmado'),
        (CHECKED_IN, 'Check-in Feito'),
        (CHECKED_OUT, 'Check-out Feito'),
        (CANCELLED, 'Cancelado'),
    ]
    
    # Chaves Estrangeiras
    accommodation_unit = models.ForeignKey(
        'accommodations.AccommodationUnit',
        on_delete=models.PROTECT,
        related_name='reservations',
        verbose_name="Unidade de Acomodação"
    )
    client = models.ForeignKey(
        'clients.Client',
        on_delete=models.PROTECT,
        related_name='reservations',
        verbose_name="Cliente"
    )
    
    # Detalhes da reserva
    check_in = models.DateTimeField(verbose_name="Data/Hora de Check-in")
    check_out = models.DateTimeField(verbose_name="Data/Hora de Check-out")
    guest_count_adults = models.PositiveIntegerField(
        default=1,
        verbose_name="Hóspedes Adultos"
    )
    guest_count_children = models.PositiveIntegerField(
        default=0,
        verbose_name="Hóspedes Crianças"
    )
    pet_count = models.PositiveIntegerField(
        default=0,
        verbose_name="Quantidade de Animais",
        help_text="Número de animais de estimação"
    )
    
    # Precificação - suporte a substituição manual
    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Preço Total (BRL)",
        help_text="Substituição manual de preço. Se não definido, será calculado automaticamente."
    )
    price_breakdown = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Detalhamento de Preço",
        help_text="Lista de itens de preço: [{'name': 'Diária', 'value': 100.00, 'quantity': 1}, ...]"
    )
    
    # Pool de pagamento - rastreia valores pagos vs necessários
    amount_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Valor Pago (BRL)",
        help_text="Valor total já pago pelo cliente"
    )
    payment_history = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Histórico de Pagamento",
        help_text="Lista de entradas de pagamento: [{'date': '...', 'amount': ..., 'method': '...'}, ...]"
    )
    
    # Status da reserva
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=PENDING,
        verbose_name="Status"
    )
    
    # Informações adicionais
    notes = models.TextField(blank=True, null=True, verbose_name="Observações")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Reserva"
        verbose_name_plural = "Reservas"
        ordering = ['-check_in']
    
    def __str__(self):
        return f"{self.accommodation_unit.name} - {self.client.full_name} ({self.check_in.strftime('%d/%m/%Y')} to {self.check_out.strftime('%d/%m/%Y')})"
    
    @property
    def amount_remaining(self):
        """Calcula o valor restante a ser pago."""
        if self.total_price is None:
            return 0
        return max(0, self.total_price - self.amount_paid)
    
    @property
    def is_fully_paid(self):
        """Verifica se a reserva está totalmente paga."""
        if self.total_price is None or self.total_price == 0:
            return False
        return self.amount_paid >= self.total_price
    
    def clean(self):
        """
        CRÍTICO: Valida que não há reservas sobrepostas para a mesma unidade.
        Isso previne reservas duplicadas.
        """
        super().clean()
        
        # Valida que check-out é depois do check-in
        if self.check_out <= self.check_in:
            raise ValidationError({
                'check_out': 'A data de check-out deve ser posterior à data de check-in.'
            })
        
        # Verifica reservas sobrepostas
        # Duas reservas se sobrepõem se:
        # - Uma começa antes da outra terminar E
        # - Uma termina depois da outra começar
        # Excluímos reservas canceladas das verificações de sobreposição
        overlapping = Reservation.objects.filter(
            accommodation_unit=self.accommodation_unit
        ).exclude(
            status=self.CANCELLED
        ).exclude(
            pk=self.pk  # Exclui a si mesmo ao atualizar reserva existente
        ).filter(
            check_in__lt=self.check_out,
            check_out__gt=self.check_in
        )
        
        if overlapping.exists():
            # Constrói mensagem de erro amigável (conforme requisito)
            conflicts = []
            for reservation in overlapping:
                conflicts.append(
                    f"Esta reserva está conflitando com a de {reservation.client.full_name}, "
                    f"check-in {reservation.check_in.strftime('%d/%m/%y %H:%M')} e "
                    f"check-out {reservation.check_out.strftime('%d/%m/%y %H:%M')}."
                )
            
            raise ValidationError({
                'check_in': ' '.join(conflicts)
            })
    
    def save(self, *args, **kwargs):
        """
        Sobrescreve save para chamar validação clean() e lidar com status auto-sujo.
        """
        # Sempre chama clean antes de salvar
        self.full_clean()
        
        # Auto-marca unidade como suja no checkout
        if self.status == self.CHECKED_OUT:
            self.accommodation_unit.status = 'DIRTY'
            self.accommodation_unit.save()
        
        super().save(*args, **kwargs)

