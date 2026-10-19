# Nuestra Vida

PWA móvil preparada para GitHub Pages.

## Probar en GitHub Pages
1. Crea un repositorio nuevo, por ejemplo `nuestra-vida`.
2. Sube todos los archivos de este paquete a la raíz.
3. En Settings > Pages, selecciona Deploy from a branch, rama main y carpeta /(root).
4. Abre la dirección publicada desde el móvil.
5. Android/Chrome: menú > Añadir a pantalla de inicio. iPhone/Safari: Compartir > Añadir a pantalla de inicio.

## Estado actual
- Funciona en modo local para probar interfaz y comportamiento.
- Selector Oscar/Mi mujer simula las dos cuentas.
- Eventos y notas familiares o privadas.
- Compra compartida, historial recurrente e iconos.
- Avisos locales mientras la aplicación está activa.

## Supabase
- Ejecuta `supabase.sql` en SQL Editor.
- Completa `config.js` con la URL y anon key.
- La siguiente integración sustituirá el selector simulado por Supabase Auth y sincronización en tiempo real.
- No pongas nunca la service_role key en `config.js`.

## Notificaciones
Las notificaciones con la app totalmente cerrada necesitan Web Push y una función servidor/Edge Function que programe el envío. Esta versión permite probar permisos y avisos locales con la PWA activa.
