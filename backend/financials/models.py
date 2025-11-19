from django.db import models


class Transaction(models.Model):
    """
    Transaction model for managing financial records.
    Supports both income (Account Receivable) and expenses (Account Payable).
    """
    
    # Transaction type choices
    INCOME = 'INCOME'
    EXPENSE = 'EXPENSE'
    
    TRANSACTION_TYPE_CHOICES = [
        (INCOME, 'Income (Account Receivable)'),
        (EXPENSE, 'Expense (Account Payable)'),
    ]
    
    # Payment method choices
    PIX = 'PIX'
    CREDIT_CARD = 'CREDIT_CARD'
    DEBIT_CARD = 'DEBIT_CARD'
    CASH = 'CASH'
    BANK_TRANSFER = 'BANK_TRANSFER'
    
    PAYMENT_METHOD_CHOICES = [
        (PIX, 'Pix'),
        (CREDIT_CARD, 'Credit Card'),
        (DEBIT_CARD, 'Debit Card'),
        (CASH, 'Cash'),
        (BANK_TRANSFER, 'Bank Transfer'),
    ]
    
    # Category choices
    LODGING = 'LODGING'
    MAINTENANCE = 'MAINTENANCE'
    UTILITIES = 'UTILITIES'
    SUPPLIES = 'SUPPLIES'
    SALARY = 'SALARY'
    OTHER = 'OTHER'
    
    CATEGORY_CHOICES = [
        (LODGING, 'Lodging'),
        (MAINTENANCE, 'Maintenance'),
        (UTILITIES, 'Utilities'),
        (SUPPLIES, 'Supplies'),
        (SALARY, 'Salary'),
        (OTHER, 'Other'),
    ]
    
    # Foreign Key (nullable - some expenses not linked to reservations)
    reservation = models.ForeignKey(
        'reservations.Reservation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions',
        verbose_name="Reservation"
    )
    
    # Transaction details
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Amount (BRL)",
        help_text="Amount in Brazilian Reais"
    )
    transaction_type = models.CharField(
        max_length=20,
        choices=TRANSACTION_TYPE_CHOICES,
        verbose_name="Transaction Type"
    )
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default=LODGING,
        verbose_name="Category"
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        verbose_name="Payment Method"
    )
    
    # Dates
    due_date = models.DateField(verbose_name="Due Date")
    paid_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Paid Date"
    )
    
    # Additional info
    description = models.TextField(blank=True, null=True, verbose_name="Description")
    notes = models.TextField(blank=True, null=True, verbose_name="Notes")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Transaction"
        verbose_name_plural = "Transactions"
        ordering = ['-due_date']
    
    def __str__(self):
        status = "Paid" if self.is_paid else "Unpaid"
        return f"{self.get_transaction_type_display()} - R$ {self.amount} ({status})"
    
    @property
    def is_paid(self):
        """
        Returns True if the transaction has been paid (paid_date is set).
        """
        return self.paid_date is not None

