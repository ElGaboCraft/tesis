from django.contrib.auth import get_user_model
from django.db.models.signals import post_migrate, post_save
from django.dispatch import receiver
from django.utils.text import slugify

from .models import Category, Tag, UserSecurity

User = get_user_model()

DEFAULT_CATEGORIES = [
    {'name': 'Mesa de ayuda', 'domain': Category.DOMAIN_SUPPORT, 'description': 'Tickets operativos y atencion de usuarios finales.'},
    {'name': 'Soporte on-site', 'domain': Category.DOMAIN_SUPPORT, 'description': 'Atenciones presenciales, hardware y periféricos.'},
    {'name': 'Gestion de incidencias', 'domain': Category.DOMAIN_SYSTEMS, 'description': 'Incidentes funcionales, seguimiento y escalamiento.'},
    {'name': 'Administracion de accesos', 'domain': Category.DOMAIN_SYSTEMS, 'description': 'Altas, bajas, permisos y controles de identidad.'},
    {'name': 'Infraestructura cloud', 'domain': Category.DOMAIN_INFRASTRUCTURE, 'description': 'Servicios en nube, servidores y plataformas.'},
    {'name': 'Redes y conectividad', 'domain': Category.DOMAIN_INFRASTRUCTURE, 'description': 'LAN, WAN, VPN, firewall y enlaces.'},
    {'name': 'Respaldo y continuidad', 'domain': Category.DOMAIN_INFRASTRUCTURE, 'description': 'Backups, DRP y continuidad operativa.'},
    {'name': 'Monitoreo y observabilidad', 'domain': Category.DOMAIN_INFRASTRUCTURE, 'description': 'Alertas, capacidad y tableros de monitoreo.'},
]

DEFAULT_TAGS = [
    ('Active Directory', Category.DOMAIN_SYSTEMS, 'Gestion de usuarios y grupos.'),
    ('Onboarding', Category.DOMAIN_SUPPORT, 'Alta de usuarios, equipos y accesos.'),
    ('Offboarding', Category.DOMAIN_SUPPORT, 'Baja de usuarios y retiro de accesos.'),
    ('Inventario', Category.DOMAIN_SUPPORT, 'Control de activos y periféricos.'),
    ('VPN', Category.DOMAIN_INFRASTRUCTURE, 'Accesos remotos y túneles seguros.'),
    ('Firewall', Category.DOMAIN_INFRASTRUCTURE, 'Reglas, aperturas y segmentación.'),
    ('Backup', Category.DOMAIN_INFRASTRUCTURE, 'Respaldo, restauración y pruebas.'),
    ('Virtualizacion', Category.DOMAIN_INFRASTRUCTURE, 'VMware, Hyper-V y clusters.'),
    ('Monitorizacion', Category.DOMAIN_INFRASTRUCTURE, 'Alertas, métricas y trazabilidad.'),
    ('Correo corporativo', Category.DOMAIN_SYSTEMS, 'Buzones, alias y distribución.'),
    ('Base de datos', Category.DOMAIN_SYSTEMS, 'Mantenimiento y soporte a motores de datos.'),
    ('Seguridad endpoint', Category.DOMAIN_SUPPORT, 'Antivirus, cifrado y postura de equipos.'),
]


@receiver(post_migrate)
def bootstrap_security_catalogs(sender, **kwargs):
	# Seeder automatico de base: root + catalogos iniciales.
    if sender.name != 'tasks':
        return

    root_user, created = User.objects.get_or_create(
        username='root',
        defaults={
            'email': 'root@teyvat.local',
            'is_staff': True,
            'is_superuser': True,
            'first_name': 'Root',
            'last_name': 'Admin',
        },
    )

        if created:
		# Primera instalacion: root queda listo para entrar.
                root_user.set_password('tavf^P^tT8Rvdm!=gbLA')
        root_user.save()
    elif not root_user.is_superuser or not root_user.is_staff:
        root_user.is_superuser = True
        root_user.is_staff = True
        root_user.save(update_fields=['is_superuser', 'is_staff'])

    for item in DEFAULT_CATEGORIES:
        Category.objects.update_or_create(
            slug=slugify(item['name']),
            defaults={
                'name': item['name'],
                'domain': item['domain'],
                'description': item['description'],
                'is_active': True,
            },
        )

    for name, domain, description in DEFAULT_TAGS:
        Tag.objects.update_or_create(
            slug=slugify(name),
            defaults={
                'name': name,
                'domain': domain,
                'description': description,
                'is_active': True,
            },
        )


@receiver(post_save, sender=User)
def ensure_user_security(sender, instance, created, **kwargs):
	# Siempre que nace un usuario, le creamos su ficha de seguridad.
    if created:
        UserSecurity.objects.get_or_create(user=instance)