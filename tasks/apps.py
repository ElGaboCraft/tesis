from django.apps import AppConfig


class TasksConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'tasks'

    def ready(self):
        # Import de signals en startup: si se toca mal, varias automatizaciones dejan de correr.
        from . import signals  # noqa: F401
