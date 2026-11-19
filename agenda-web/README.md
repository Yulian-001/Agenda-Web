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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
