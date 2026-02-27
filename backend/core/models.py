from django.db import models
from django.utils import timezone


class LoginAttempt(models.Model):
    """
    Tracks failed login attempts per username to enforce exponential backoff.
    After each failure the required wait time doubles: 2^(failure_count - 1) seconds,
    capped at MAX_BACKOFF_SECONDS.
    """

    MAX_BACKOFF_SECONDS = 3600  # 1 hour cap

    username = models.CharField(max_length=150, unique=True, db_index=True)
    failure_count = models.PositiveIntegerField(default=0)
    last_failure = models.DateTimeField(null=True, blank=True)

    def get_wait_seconds(self):
        """Return required wait time in seconds based on current failure count."""
        if self.failure_count <= 0:
            return 0
        return min(2 ** (self.failure_count - 1), self.MAX_BACKOFF_SECONDS)

    def is_locked(self):
        """Return True if this username is still within a backoff window."""
        if self.failure_count <= 0 or not self.last_failure:
            return False
        elapsed = (timezone.now() - self.last_failure).total_seconds()
        return elapsed < self.get_wait_seconds()

    def seconds_until_retry(self):
        """Return the number of seconds remaining in the current backoff period."""
        if not self.is_locked():
            return 0
        elapsed = (timezone.now() - self.last_failure).total_seconds()
        return max(0, self.get_wait_seconds() - elapsed)

    def record_failure(self):
        """Increment failure count and update last_failure timestamp."""
        self.failure_count += 1
        self.last_failure = timezone.now()
        self.save()

    def reset(self):
        """Clear failure count after a successful login."""
        self.failure_count = 0
        self.last_failure = None
        self.save()

    class Meta:
        verbose_name = 'Login Attempt'
        verbose_name_plural = 'Login Attempts'
