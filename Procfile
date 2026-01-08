release: npm run build && python collect_static.py && python backend/manage.py migrate
web: gunicorn --chdir backend config.wsgi:application --log-file -
