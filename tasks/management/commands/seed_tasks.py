from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from tasks.models import Category, Tag, Task

User = get_user_model()


class Command(BaseCommand):
    help = 'Carga tareas demo para visualizar el tablero rápidamente.'

    def handle(self, *args, **options):
        # Limpiamos tareas para que el seed sea repetible sin basura acumulada.
        Task.objects.all().delete()

        today = date.today()
        root_user = User.objects.filter(username='root').first()
        analista, _created = User.objects.get_or_create(
            username='analista.soporte',
            defaults={'first_name': 'Analista', 'last_name': 'Soporte', 'email': 'analista.soporte@teyvat.local'},
        )
        if not analista.has_usable_password():
            # Usuario demo para pruebas manuales.
            analista.set_password('Operador2025*')
            analista.save()

        infra_lead, _created = User.objects.get_or_create(
            username='infra.lead',
            defaults={'first_name': 'Infra', 'last_name': 'Lead', 'email': 'infra.lead@teyvat.local'},
        )
        if not infra_lead.has_usable_password():
            infra_lead.set_password('Operador2025*')
            infra_lead.save()

        roadmap_category = Category.objects.get(slug='gestion-de-incidencias')
        product_category = Category.objects.get(slug='administracion-de-accesos')
        ops_category = Category.objects.get(slug='redes-y-conectividad')
        quality_category = Category.objects.get(slug='respaldo-y-continuidad')

        records = [
            {
                'title': 'Diseñar roadmap trimestral',
                'description': 'Definir objetivos, owners y entregables del siguiente trimestre.',
                'status': Task.STATUS_IN_PROGRESS,
                'priority': Task.PRIORITY_URGENT,
                'assignees': [infra_lead, analista],
                'created_by': root_user,
                'category': roadmap_category,
                'due_date': today + timedelta(days=2),
                'estimated_hours': 8,
                'progress': 65,
                'tags': ['monitorizacion', 'base-de-datos'],
            },
            {
                'title': 'Refinar backlog de producto',
                'description': 'Normalizar tickets, criterios de aceptacion y prioridad del sprint.',
                'status': Task.STATUS_TODO,
                'priority': Task.PRIORITY_HIGH,
                'assignees': [analista],
                'created_by': root_user,
                'category': product_category,
                'due_date': today + timedelta(days=5),
                'estimated_hours': 6,
                'progress': 15,
                'tags': ['active-directory', 'onboarding'],
            },
            {
                'title': 'Resolver bloqueo de integracion ERP',
                'description': 'Coordinar con infraestructura y proveedor externo para habilitar credenciales.',
                'status': Task.STATUS_BLOCKED,
                'priority': Task.PRIORITY_URGENT,
                'assignees': [infra_lead],
                'created_by': root_user,
                'category': ops_category,
                'due_date': today - timedelta(days=1),
                'estimated_hours': 12,
                'progress': 40,
                'tags': ['vpn', 'firewall'],
            },
            {
                'title': 'Publicar informe de calidad',
                'description': 'Consolidar metricas de QA y publicar reporte final del release.',
                'status': Task.STATUS_DONE,
                'priority': Task.PRIORITY_MEDIUM,
                'assignees': [analista, infra_lead],
                'created_by': root_user,
                'category': quality_category,
                'due_date': today,
                'estimated_hours': 4,
                'progress': 100,
                'tags': ['backup', 'monitorizacion'],
            },
        ]

        for record in records:
            tag_slugs = record.pop('tags')
            assignees = record.pop('assignees')
            task = Task.objects.create(**record)
			# No tocar este orden: primero assignees, despues tags; evita validaciones raras en cambios futuros.
            task.assignees.set(assignees)
            task.tags.set(Tag.objects.filter(slug__in=tag_slugs))

        self.stdout.write(self.style.SUCCESS('Tareas demo creadas correctamente.'))