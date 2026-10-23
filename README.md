# Centro SNS Connect

Sistema de Agenda y Gestión de Pacientes — Centro SNS

Crear una aplicación web moderna, profesional, rápida y responsive para Centro SNS, enfocada en la gestión de pacientes, agenda de consultas, seguimiento de revisiones y comunicación mediante WhatsApp.

El sistema debe funcionar como una combinación de:

Agenda/calendario.

Base de datos de pacientes.

Historial de consultas.

Seguimiento de revisiones.

Control de asistencia.

Gestión de pacientes que abandonaron.

Comunicación directa por WhatsApp.

Recordatorios y felicitaciones de cumpleaños.

1. PANEL PRINCIPAL / DASHBOARD

Crear un dashboard inicial con información resumida:

Turnos de hoy.

Turnos de mañana.

Próximos turnos.

Pacientes en revisión.

Revisiones próximas.

Pacientes sin confirmar.

Pacientes a los que todavía no se envió el horario.

Pacientes que ya recibieron el horario.

Cumpleaños del día.

Cumpleaños próximos.

Pacientes con estado "Abandono".

Pacientes con faltas.

Mostrar tarjetas estadísticas:

Turnos de hoy
Cantidad de pacientes agendados.

Pendientes de envío
Cantidad de pacientes cuyo horario todavía no fue enviado por WhatsApp.

Enviados
Cantidad de pacientes cuyo horario ya fue enviado.

Revisiones próximas
Cantidad de pacientes cuya revisión está próxima.

Cumpleaños
Cantidad de pacientes que cumplen años próximamente.

2. BASE DE DATOS DE PACIENTES

Crear una sección llamada:

Pacientes

Cada paciente debe tener una ficha individual.

Campos:

Nombre.

Apellido.

Nombre completo.

Número de cédula.

Fecha de nacimiento.

Número de teléfono.

WhatsApp.

Dirección.

Fecha de primera consulta.

Observaciones.

Estado del paciente.

Fecha de próxima revisión.

Motivo de la revisión.

Última consulta.

Próximo turno.

Historial de turnos.

Historial de comunicaciones.

Estados disponibles:

Activo.

En revisión.

Pendiente de revisión.

Abandono.

Falta.

Falta por enfermedad.

Falta por otra causa.

Reprogramado.

Permitir agregar nuevos estados posteriormente.

3. BUSCADOR GLOBAL

El buscador debe ser rápido y estar disponible en la sección de pacientes y también en la agenda.

Debe permitir buscar escribiendo:

Nombre.

Apellido.

Nombre completo.

Número de cédula.

Número de teléfono.

Ejemplo:

Si escribo:

"Juan"

mostrar todos los pacientes cuyo nombre o apellido contenga Juan.

Si escribo:

"1234567"

buscar por número de cédula.

La búsqueda debe actualizar los resultados mientras el usuario escribe.

4. FICHA DEL PACIENTE

Al abrir un paciente mostrar una ficha completa.

Encabezado:

Nombre y Apellido

Debajo mostrar:

Cédula.

Fecha de nacimiento.

Edad calculada automáticamente.

WhatsApp.

Estado actual.

Botones principales:

Editar paciente

Agendar turno

Enviar WhatsApp

Registrar revisión

Registrar falta

Marcar abandono

Mostrar debajo:

Historial de turnos

Tabla:

Fecha | Hora | Tipo | Estado | Comunicación

Ejemplo:

15/08/2026 | 09:00 | Consulta | Confirmado | Horario enviado

22/08/2026 | 10:00 | Revisión | Pendiente | No enviado

5. BOTÓN WHATSAPP

Cada paciente debe tener un botón verde:

WhatsApp

Al presionarlo debe abrir directamente una conversación de WhatsApp con el número registrado.

Utilizar enlace:

https://wa.me/NUMERO

El número debe almacenarse correctamente con código de país.

No utilizar enlaces incorrectos con espacios, guiones o caracteres especiales.

6. AGENDA / CALENDARIO

Crear una agenda visual simple, limpia y rápida.

Permitir visualizar:

Día.

Semana.

Mes.

La vista principal recomendada es día y semana.

Cada turno debe mostrar:

Hora.

Nombre del paciente.

Estado.

Tipo de consulta.

Indicador de WhatsApp.

Indicador de envío.

Ejemplo:

09:00
Juan Pérez
Revisión
🟢 Enviado

10:30
María González
Consulta
🟠 No enviado

7. AGREGAR TURNO

Crear botón:

+ Agregar turno

Al hacer clic:

Seleccionar paciente mediante buscador.

Permitir buscar por:

Nombre.

Apellido.

Cédula.

Teléfono.

Después seleccionar:

Fecha.

Hora.

Duración.

Tipo de consulta.

Profesional.

Observaciones.

Tipos de turno:

Primera consulta.

Consulta.

Revisión.

Control.

Otro.

Botón:

Guardar turno

8. ENVÍO DEL HORARIO POR WHATSAPP

Cada turno debe tener un botón:

Enviar horario por WhatsApp

Al hacer clic debe abrir WhatsApp con un mensaje previamente preparado.

Ejemplo:

"Hola, [NOMBRE] 👋

Te escribimos desde Centro SNS para confirmar tu horario.

📅 Fecha: [FECHA]
🕐 Hora: [HORA]

Te esperamos en Centro SNS.

Por favor, confirmá la recepción de este mensaje. 🙌"

El sistema debe registrar que el mensaje fue enviado.

Después del clic, cambiar el indicador:

🟠 No enviado

a:

🟢 Enviado

Guardar:

Fecha del envío.

Hora del envío.

Usuario que realizó el envío.

IMPORTANTE:

No marcar como "enviado" simplemente porque el botón fue abierto. Mostrar claramente que se trata de un registro de envío realizado por el usuario mediante WhatsApp.

9. FILTRO "NO ENVIADOS"

En la agenda agregar un filtro:

No enviados

Al activarlo mostrar únicamente los turnos cuyo horario todavía no fue enviado.

También agregar:

Enviados

Todos

Esto permitirá al personal detectar rápidamente a quién todavía debe enviarle el horario.

10. REVISIONES

Cada paciente debe poder tener una:

Fecha de próxima revisión

Cuando se registre una revisión, guardar:

Fecha de revisión.

Hora.

Observación.

Profesional.

Estado.

Mostrar visualmente una etiqueta:

🔵 EN REVISIÓN

Ejemplo:

Juan Pérez

🔵 EN REVISIÓN

Próxima revisión:
22/08/2026 — 10:00

11. RECORDATORIO DE REVISIÓN

El sistema debe detectar automáticamente las revisiones próximas.

Por defecto:

7 días antes de la revisión

mostrar una alerta:

"Revisión próxima"

Ejemplo:

🔔 Revisión de Juan Pérez en 7 días.

Mostrar botón:

Enviar WhatsApp

Al presionarlo abrir WhatsApp con un mensaje:

"Hola, [NOMBRE] 👋

Te escribimos desde Centro SNS para recordarte que tenés programada tu revisión.

📅 Fecha: [FECHA]
🕐 Hora: [HORA]

Te esperamos en Centro SNS. 🙌"

Registrar:

Recordatorio enviado.

Fecha.

Hora.

Usuario.

IMPORTANTE:

El sistema no debe enviar WhatsApp automáticamente sin intervención del usuario, salvo que posteriormente se configure una integración oficial con WhatsApp Business API.

12. ALERTAS DE REVISIONES

En el dashboard crear una sección:

Revisiones próximas

Mostrar:

Paciente.

Fecha.

Hora.

Días restantes.

Estado del recordatorio.

Botón WhatsApp.

Ejemplo:

Juan Pérez | 22/08 | 10:00 | En 7 días | No enviado | WhatsApp

María López | 20/08 | 09:30 | En 5 días | Enviado | WhatsApp

Usar diferentes indicadores visuales:

🟢 Recordatorio enviado.

🟠 Recordatorio pendiente.

🔴 Revisión vencida.

13. CUMPLEAÑOS

Utilizar la fecha de nacimiento de cada paciente para calcular automáticamente su cumpleaños.

Crear sección:

Cumpleaños

Mostrar:

Cumpleaños de hoy

y

Próximos cumpleaños

Ejemplo:

🎂 Juan Pérez
Cumpleaños: Hoy

Botón:

🎉 Felicitar por WhatsApp

Abrir WhatsApp con un mensaje:

"🎉 ¡Feliz cumpleaños, [NOMBRE]!

Desde todo el equipo de Centro SNS queremos desearte un muy feliz cumpleaños. 🥳

Que tengas un excelente día y que este nuevo año esté lleno de salud, bienestar y buenos momentos.

¡Un abrazo de parte de Centro SNS! ❤️"

Registrar que la felicitación fue enviada.

Mostrar:

🟢 Felicitación enviada

o

🟠 Felicitación pendiente

14. CUMPLEAÑOS PRÓXIMOS

Mostrar en dashboard los cumpleaños de los próximos 7 días.

Ejemplo:

🎂 Cumpleaños próximos

16/08 — Juan Pérez
18/08 — María González
20/08 — Carlos López

Cada uno debe tener botón:

WhatsApp

15. CONTROL DE FALTAS

En cada turno permitir cambiar el estado a:

Asistió.

Falta.

Falta por enfermedad.

Falta por otra causa.

Canceló.

Reprogramó.

Al seleccionar:

Falta

permitir registrar observación.

Ejemplo:

"Paciente no pudo asistir."

Si selecciona:

Falta por enfermedad

guardar ese motivo.

16. PACIENTES CON ABANDONO

Crear etiqueta:

🔴 ABANDONO

Permitir marcar manualmente a un paciente como abandono.

Al marcarlo:

Guardar fecha.

Guardar motivo.

Permitir agregar observación.

Mantener todo su historial.

Ejemplo:

Estado:
🔴 ABANDONO

Fecha:
15/08/2026

Motivo:
No continuó tratamiento.

IMPORTANTE:

No eliminar al paciente de la base de datos.

Debe permanecer disponible para búsquedas e historial.

17. HISTORIAL DEL PACIENTE

Cada paciente debe tener un historial cronológico.

Mostrar:

Primera consulta.

Consultas.

Revisiones.

Turnos.

Asistencias.

Faltas.

Reprogramaciones.

Abandono.

Comunicaciones realizadas.

Ejemplo:

15/08/2026 — Revisión agendada.

08/08/2026 — Consulta realizada.

01/08/2026 — Horario enviado por WhatsApp.

25/07/2026 — Falta por enfermedad.

18. FILTROS DE PACIENTES

Crear filtros rápidos:

Todos

Activos

En revisión

Revisión próxima

Abandono

Faltas

Cumpleaños

Permitir combinar filtros.

19. DISEÑO

El diseño debe ser:

Profesional.

Minimalista.

Moderno.

Fácil de utilizar.

Rápido.

Responsive.

Adaptado a computadora, tablet y celular.

No hacer una interfaz excesivamente compleja.

La agenda debe ser el elemento principal.

Usar tarjetas, etiquetas de colores y botones claros.

Colores sugeridos:

Verde para WhatsApp/enviado.

Azul para revisión.

Amarillo/naranja para pendientes.

Rojo para abandono/faltas.

Gris para estados neutros.

20. BASE DE DATOS

Crear una base de datos relacional.

Tablas principales:

patients

id

first_name

last_name

full_name

document_number

birth_date

phone

whatsapp

address

first_consultation_date

status

notes

created_at

updated_at

appointments

id

patient_id

date

time

duration

appointment_type

professional

status

notes

created_at

updated_at

appointment_messages

id

appointment_id

patient_id

message_type

sent_at

sent_by

status

Tipos de mensaje:

appointment_confirmation

review_reminder

birthday

reviews

id

patient_id

appointment_id

review_date

review_time

status

notes

reminder_sent

reminder_sent_at

attendance

id

appointment_id

patient_id

status

reason

notes

created_at

patient_status_history

id

patient_id

previous_status

new_status

reason

notes

created_at

21. SEGURIDAD

Como se almacenarán datos personales de pacientes, implementar:

Login de usuarios.

Protección de rutas.

Base de datos segura.

Control de acceso.

No mostrar información de pacientes a usuarios no autenticados.

Validación de datos.

Evitar duplicados por número de cédula.

Confirmación antes de eliminar información.

Preferir archivar pacientes en lugar de eliminarlos definitivamente.

22. DUPLICADOS

Al registrar un paciente nuevo, verificar automáticamente si ya existe un paciente con la misma:

Cédula.

Número de teléfono.

Si existe, mostrar:

"Este paciente ya existe en el sistema."

Y ofrecer:

Abrir paciente existente

23. EXPERIENCIA DE USUARIO

Desde cualquier lugar del sistema debe ser posible:

Buscar paciente.

Abrir ficha.

Ver próximos turnos.

Agendar turno.

Enviar WhatsApp.

Registrar asistencia.

Registrar revisión.

Marcar falta.

Marcar abandono.

La navegación debe ser rápida y requerir la menor cantidad posible de clics.

24. MENÚ PRINCIPAL

Crear menú lateral:

🏠 Dashboard

📅 Agenda

👥 Pacientes

🔵 Revisiones

🎂 Cumpleaños

🟠 Pendientes de envío

🔴 Faltas / Abandonos

📊 Historial

⚙️ Configuración

25. REGLA IMPORTANTE SOBRE WHATSAPP

No crear un sistema falso que diga que WhatsApp confirmó el envío.

El botón debe abrir WhatsApp con el mensaje preparado.

Después de que el usuario pulse el botón, registrar:

WhatsApp abierto / envío gestionado

y permitir marcar:

Enviado

De esta manera el sistema refleja correctamente la acción realizada.

26. RESULTADO FINAL

Quiero una aplicación que permita al personal de Centro SNS abrir el sistema por la mañana y ver inmediatamente:

Qué pacientes vienen hoy.

A qué hora viene cada uno.

A quién todavía no se le envió el horario.

A quién ya se le envió.

Qué pacientes están en revisión.

Qué revisiones se aproximan.

A quién hay que enviar recordatorio.

Qué pacientes faltaron.

Qué pacientes abandonaron.

Quién cumple años hoy.

A quién se le puede enviar felicitación por WhatsApp.

La prioridad es que el sistema sea simple, visual, rápido y práctico para el trabajo diario, evitando funciones innecesarias.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://agendadavanci.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e1988fa1-bcb4-4b98-a445-c4b3cedaa11a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
