[Contexto funcional y técnico de Agenda Web](CONTEXTO.md)

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Personalizar una copia para un negocio

Edita [`config/business.json`](config/business.json) en el repositorio privado del cliente:

- `brand` define el nombre, el título y la descripción de la portada, el saludo del login, la dirección y la ruta del logo. Guarda el archivo en `public/logos/` y referencia, por ejemplo, `"/logos/mi-negocio.webp"`. Puedes usar PNG, JPEG, WebP o SVG. Si dejas `logo` vacío, se muestra la inicial.
- `socials` contiene los enlaces públicos. Usa una cadena vacía o elimina la entrada para ocultar una red. Deja vacía la dirección si no quieres mostrarla.
- `colors` aplica la paleta. `primary` y `onPrimary` controlan los botones y la navegación. `accent` se usa para enlaces y focos. `background` y `surface` controlan el fondo y las tarjetas. `text` y `mutedText` definen el texto principal y secundario. Por ejemplo, usa `"#1e3a8a"` en `primary`, `"#ffffff"` en `onPrimary` y `"#fdf2f8"` en `background` para una paleta azul y rosada.

Recompila al publicar cambios de identidad. Servicios, perfiles, fotos del equipo, horarios y reservas se gestionan con los módulos de la aplicación.

## Límite de recuperación por IP

Configura `RECOVERY_CLIENT_IP_HEADER` con el nombre de una cabecera que tu proxy sobrescriba con una sola IP verificada por petición, como `x-client-ip`. Bloquea el acceso directo al servidor de la aplicación si configuras esta opción. Cuando no hay una cabecera de confianza configurada o su valor es inválido, las solicitudes comparten un límite por IP. El límite por número se aplica en ambos casos.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Probar una copia privada en Vercel

1. Clona el código en el repositorio privado del negocio y crea una base PostgreSQL vacía dedicada a ese proyecto. Git clona el código y las migraciones. Los registros viven en PostgreSQL. Mantén el `.env`, las credenciales y cualquier respaldo fuera del repositorio.
2. Desde `agenda-web/`, configura `DATABASE_URL` de la base nueva en tu `.env` privado. Ejecuta `pnpm install --frozen-lockfile`, `pnpm exec prisma migrate deploy` y `pnpm exec prisma generate`. Crea una sola cuenta con la seed descrita abajo.
3. Importa el repositorio privado en Vercel con `agenda-web` como **Root Directory**. Configura `DATABASE_URL`, un `JWT_SECRET` exclusivo del proyecto y `APP_PUBLIC_URL` con el dominio HTTPS de la app. Si configuras un comando de compilación, usa `pnpm exec prisma generate && pnpm build`. [Configuración del proyecto](https://vercel.com/docs/project-configuration/project-settings), [variables de entorno](https://vercel.com/docs/environment-variables).
4. Para probar correos y recordatorios, ejecuta `pnpm mail:worker` como proceso persistente en otro servicio, con la misma base, el mismo `JWT_SECRET`, la URL pública y las credenciales privadas del remitente. El worker actual procesa la cola desde ese servicio mientras Vercel sirve la web. [Duración de las funciones en Vercel](https://vercel.com/docs/functions/configuring-functions/duration).

## Cuenta inicial del negocio

Tras aplicar las migraciones, configura `SEED_OWNER_PHONE` (por defecto, `3144533840`) y `SEED_OWNER_PASSWORD` en el `.env` privado. Puedes definir `SEED_OWNER_NAME` y `SEED_OWNER_EMAIL` para personalizar el titular. El nombre predeterminado para `ADMIN` es **Administrador Dev**. Selecciona un rol en `SEED_OWNER_ROLE` antes de ejecutar `pnpm seed`.

- `SEED_OWNER_ROLE=ADMIN` inicia un negocio con equipo y un titular que gestiona la operación.
- `SEED_OWNER_ROLE=BARBER_BOSS` inicia un negocio con equipo y un titular que también atiende citas.
- `SEED_OWNER_ROLE=BARBER_INDEPENDENT` requiere una base sin cuentas de personal. El titular administra su catálogo, agenda y contabilidad, y es la única cuenta operativa. Los servicios que crea se le asignan automáticamente.

Para un titular que atiende citas, configura también `SEED_OWNER_PHOTO` con la URL de su foto. La seed imprime el nombre, el rol y el teléfono de ingreso. Tras iniciar sesión, verifica la dirección inicial en **Mi correo** para habilitar la recuperación. Completa el catálogo y la agenda desde el panel.

La cuenta sembrada es la cuenta del titular. Si su rol es `ADMIN`, solo ella ve su ficha en la gestión del equipo y queda excluida de las reservas públicas. El comando se puede repetir conservando el usuario existente, su modalidad y su contraseña. Usa una contraseña exclusiva por despliegue y elimina el valor inicial del entorno una vez creada la cuenta.

## Correo de la aplicación

En el archivo local `agenda-web/.env` o en las variables privadas del despliegue, agrega:

```dotenv
APP_PUBLIC_URL=http://localhost:3000
GMAIL_USER=correo-remitente@gmail.com
GMAIL_APP_PASSWORD=contraseña-de-aplicación-nueva
```

El remitente necesita una contraseña de aplicación de Google. En producción, usa el correo del negocio y cambia `APP_PUBLIC_URL` al dominio público HTTPS. El proceso de correo usa la misma base de datos y el mismo `JWT_SECRET` que la web para leer su cola cifrada.

Aplica las migraciones y regenera Prisma antes de arrancar. Para desarrollo, ejecuta `pnpm dev` y `pnpm mail:worker` en terminales separadas. Para un despliegue Compose, usa `docker compose --profile mail up -d --build app mail-worker` después de actualizar el esquema. Para simular envíos localmente, define `MAIL_PREVIEW_DIR` con una carpeta privada fuera del repositorio. El proceso escribirá archivos de correo en esa carpeta.

Cada miembro del personal verifica su dirección desde **Mi correo**. El correo de recuperación cambia después de confirmar la nueva dirección. Las reservas nuevas guardan su dirección de contacto por cita. El correo incluye botones para abrir directamente Confirmar asistencia o Cancelar cita, y la persona aplica la acción en la página que se abre. Si una cita se agenda con menos de una hora de anticipación, el comprobante incluye el enlace para responder. Las demás reciben también un recordatorio una hora antes.

### Personalizar los mensajes

- En [`scripts/mail-worker.mjs`](scripts/mail-worker.mjs), busca `BOOKING_RECEIPT` y `BOOKING_REMINDER` para cambiar el asunto, el texto y los botones del comprobante y el recordatorio.
- En ese mismo archivo, busca `BARBER_NEW_BOOKING`, `BARBER_CANCELLED` y `ADMIN_STRIKE` para editar los avisos internos. Estos correos usan colores neutros, sin logo, y muestran el servicio, la fecha, la hora y el profesional en líneas separadas.
- En [`scripts/appointment-email.mjs`](scripts/appointment-email.mjs) puedes ajustar la tipografía y el diseño común. Los correos al cliente leen el nombre y los colores principales del `config/business.json` existente. Reinicia el worker después de cambiar su código o la configuración del correo.

[Estado de preparación para producción](ESTADO_PRODUCCION.md)
