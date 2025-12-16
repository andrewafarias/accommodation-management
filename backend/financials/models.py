from django.db import models


class Transaction(models.Model):
    """
    Modelo de Transação para gerenciar registros financeiros.
    Suporta tanto receitas (Contas a Receber) quanto despesas (Contas a Pagar).
    """
    
    # Opções de tipo de transação
    INCOME = 'INCOME'
    EXPENSE = 'EXPENSE'
    
    TRANSACTION_TYPE_CHOICES = [
        (INCOME, 'Receita (Contas a Receber)'),
        (EXPENSE, 'Despesa (Contas a Pagar)'),
    ]
    
    # Opções de método de pagamento
    PIX = 'PIX'
    CREDIT_CARD = 'CREDIT_CARD'
    DEBIT_CARD = 'DEBIT_CARD'
    CASH = 'CASH'
    BANK_TRANSFER = 'BANK_TRANSFER'
    
    PAYMENT_METHOD_CHOICES = [
        (PIX, 'Pix'),
        (CREDIT_CARD, 'Cartão de Crédito'),
        (DEBIT_CARD, 'Cartão de Débito'),
        (CASH, 'Dinheiro'),
        (BANK_TRANSFER, 'Transferência Bancária'),
    ]
    
    # Opções de categoria
    LODGING = 'LODGING'
    MAINTENANCE = 'MAINTENANCE'
    UTILITIES = 'UTILITIES'
    SUPPLIES = 'SUPPLIES'
    SALARY = 'SALARY'
    OTHER = 'OTHER'
    
    CATEGORY_CHOICES = [
        (LODGING, 'Hospedagem'),
        (MAINTENANCE, 'Manutenção'),
        (UTILITIES, 'Utilidades'),
        (SUPPLIES, 'Suprimentos'),
        (SALARY, 'Salário'),
        (OTHER, 'Outro'),
    ]
    
    # Chave Estrangeira (anulável - algumas despesas não vinculadas a reservas)
    reservation = models.ForeignKey(
        'reservations.Reservation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions',
        verbose_name="Reserva"
    )
    
    # Detalhes da transação
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Valor (BRL)",
        help_text="Valor em Reais"
    )
    transaction_type = models.CharField(
        max_length=20,
        choices=TRANSACTION_TYPE_CHOICES,
        verbose_name="Tipo de Transação"
    )
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default=LODGING,
        verbose_name="Categoria"
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        verbose_name="Método de Pagamento"
    )
    
    # Datas
    due_date = models.DateField(verbose_name="Data de Vencimento")
    paid_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Data de Pagamento"
    )
    
    # Informações adicionais
    description = models.TextField(blank=True, null=True, verbose_name="Descrição")
    notes = models.TextField(blank=True, null=True, verbose_name="Observações")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Transação"
        verbose_name_plural = "Transações"
        ordering = ['-due_date']
    
    def __str__(self):
        status = "Pago" if self.is_paid else "Não Pago"
        return f"{self.get_transaction_type_display()} - R$ {self.amount} ({status})"
    
    @property
    def is_paid(self):
        """
        Retorna True se a transação foi paga (paid_date está definido).
        """
        return self.paid_date is not None

