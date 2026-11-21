# Estado de Agenda Web para producción

**Conclusión.** La aplicación puede demostrarse y ya tiene el recorrido operativo principal. Queda trabajo antes de usarla con citas reales sin supervisión. La prioridad es impedir solapamientos entre servicios de distinta duración y verificar la operación continua del correo y de la base de datos en el entorno de publicación.

La revisión corresponde a la rama `feat/desarrollo-login-afiliado`. Para decisiones anteriores y su evolución, consulta [AUDITORIA.md](AUDITORIA.md).

## Cobertura funcional

| Área | Estado actual |
| --- | --- |
| Reservas públicas | Selección de servicio, profesional, fecha y hora. Las citas canceladas liberan la franja y se conserva su historial. PostgreSQL impide reservar dos veces la misma hora de inicio para un profesional. [Citas](services/appointment.service.js) · [Disponibilidad](app/api/public/availability/route.js) |
| Operación y roles | Administrador y jefe gestionan el equipo, con protección de la cuenta administradora. El afiliado opera sobre sus propias citas y el independiente tiene catálogo y agenda propios. El personal autorizado puede confirmar y completar citas desde el panel. [Permisos](config/barberRoles.js) · [Panel](components/AppointmentBoard.js) · [Seed](seed.js) |
| Contabilidad | El administrador ve el negocio. El jefe alterna entre Equipo y Mis finanzas. El afiliado y el independiente ven cifras propias. El ingreso se registra cuando se completa la cita. [Finanzas](services/finance.service.js) |
| Correo | La cola persistente entrega OTP, verificaciones, comprobantes, recordatorios y avisos. Comprobante y recordatorio tienen ficha HTML y dos botones que abren la acción elegida. Los avisos al personal también usan la ficha. Se conserva una versión de texto. [Proceso de correo](scripts/mail-worker.mjs) · [Plantilla](scripts/appointment-email.mjs) |
| Personalización | La marca, los textos de portada, la paleta, los enlaces y los archivos de identidad se configuran por instalación. [Configuración de marca](config/business.json) |

## Verificación de esta entrega

- Compilación de producción y lint de los archivos actualizados.
- Prueba aislada con PostgreSQL y buzón simulado. Se comprobó el comprobante y el recordatorio, los enlaces de ambas acciones, la confirmación, la cancelación con falta y la liberación de la franja. Abrir el enlace dejó intacto el estado de la cita hasta enviar la acción.
- Vista previa del comprobante y el recordatorio en Chrome a 320, 390 y 960 píxeles. Ambos botones midieron al menos 48 píxeles de alto y el contenido se mantuvo dentro del ancho de la ventana.
- Queda por comprobar la presentación de estas nuevas plantillas en Gmail móvil con una entrega real.

## Antes de abrir un piloto con citas reales

1. **Evitar solapamientos por duración.** Si una cita empieza a las 09:00 y dura 90 minutos, la franja de las 10:00 debe quedar bloqueada. Hoy la comprobación y el índice protegen horas de inicio iguales. Definir cómo se congela la duración de la cita y aplicar la misma regla al publicar cupos y al confirmar una reserva, incluida la concurrencia. [Creación de citas](services/appointment.service.js) · [Índice de franjas](prisma/migrations/20261121090000_owner_and_bookable_slots/migration.sql)
2. **Desplegar y supervisar el correo.** Verificar web y proceso de correo con la misma base y el mismo secreto, remitente definitivo, dominio HTTPS y correos verificados del personal. Probar una reserva con más de una hora de anticipación, confirmar que el recordatorio sale a tiempo y revisar la entrega en Gmail móvil. Si el proveedor rechaza un mensaje, el worker registra el fallo y reintenta hasta su límite. Hace falta una alerta operativa si los fallos persisten o la cola se acumula. [Configuración del correo](README.md#correo-de-la-aplicación) · [Proceso de correo](scripts/mail-worker.mjs)
3. **Probar la actualización de una instalación existente.** El historial se comprobó en una base aislada. Una base preparada con cambios manuales requiere revisar su historial antes de aplicar migraciones. Hacer una copia de seguridad y una restauración de prueba con la configuración del cliente. [Migraciones](prisma/migrations)
4. **Cerrar la configuración del servidor.** Proveer secretos exclusivos por cliente, restringir el acceso a PostgreSQL, confirmar HTTPS y cabeceras de recuperación detrás del proxy, y retirar la ruta de diagnóstico pública del despliegue. Probar el inicio de sesión y el cierre desde el dominio final. [Docker Compose](docker-compose.yml) · [Diagnóstico actual](app/api/test/route.js) · [Límites de recuperación](README.md#límite-de-recuperación-por-ip)

## Después del piloto

- **Avisos y soporte.** Revisar casos de correo incorrecto, entrega en spam, recuperación asistida y solicitudes de clientes que necesiten corregir o reprogramar la reserva.
- **Operación diaria.** Medir cuánto tarda el personal en cerrar citas, revisar reservas pendientes al final del día y definir si se necesita un estado específico de inasistencia y un procedimiento de corrección con auditoría.
- **Pruebas repetibles.** Incorporar a CI compilación, lint, instalación limpia y pruebas de permisos, reserva, cancelación y correo simulado. Medir latencia y disponibilidad en el despliegue real antes de convertirlas en compromisos comerciales.
- **Acciones dentro del buzón.** Si se decide usar AMP para Gmail, preparar la integración y registrar el remitente. Mantener la versión HTML y su página de acción para otros clientes de correo. [AMP para Gmail](https://developers.google.com/workspace/gmail/ampemail) · [Registro del remitente](https://developers.google.com/workspace/gmail/ampemail/register)

## Criterio para dejar el piloto en operación

Completar una reserva real de prueba en el dominio publicado, recibir el comprobante y el recordatorio, responder desde los botones, comprobar que la agenda y el historial quedan correctos, y repetir el flujo con los roles del negocio. Validar los solapamientos y una restauración de la base antes de aceptar citas sin supervisión.
