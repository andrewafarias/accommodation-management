from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accommodations', '0010_unitimage'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='accommodationunit',
            name='status',
        ),
        migrations.RemoveField(
            model_name='accommodationunit',
            name='auto_dirty_days',
        ),
        migrations.RemoveField(
            model_name='accommodationunit',
            name='last_cleaned_at',
        ),
    ]
