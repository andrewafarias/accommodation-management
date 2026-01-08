release: python backend/manage.py collectstatic --noinput && python backend/manage.py migrate
web: gunicorn --chdir backend config.wsgi:application --log-file -
