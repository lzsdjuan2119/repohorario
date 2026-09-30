# 💕 Juan & Nathy • Horario y Todo (Web App con Login & Permisos)

Aplicación web integral para la coordinación operativa, financiera y afectiva de relación a distancia entre **Juan** y **Nathy**.

Diseñada con **Node.js**, **Express**, **Bootstrap 5.3**, **Chart.js** y **SheetJS**, con estética moderna, micro-animaciones, modo responsivo y persistencia completa.

---

## 🚀 Inicio Rápido

Para iniciar el servidor y abrir la aplicación:

```bash
# 1. Instalar dependencias (ya instaladas)
npm install

# 2. Iniciar la aplicación
npm start
```

Luego abre tu navegador en:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🔐 1. Sistema de Login & Control de Acceso por Usuario

La aplicación cuenta con una **pantalla de inicio de sesión con PIN de seguridad** para Juan y Nathy:

- **Perfiles Disponibles:** **Juan 👦** y **Nathy 👧**.
- **PIN Inicial por Defecto:** `1234` (ambos pueden cambiar su propio PIN desde el menú de usuario en la barra superior).
- **Cierre de Sesión:** Botón *"Cerrar Sesión"* en el menú superior para bloquear el acceso.

---

## 🛡️ 2. Matriz de Permisos: Privado vs Conjunto

Para que cada uno mantenga la autonomía de sus tiempos sin perder la colaboración en pareja:

| Módulo / Pestaña | Juan (Sesión Juan) | Nathy (Sesión Nathy) | Tipo de Acceso |
| :--- | :---: | :---: | :--- |
| **Horario Juan (24h)** | ✏️ **Editar** (Pintar celdas, atajos) | 👁️ **Solo Lectura** (Visualiza sin alterar) | **Individual Juan** |
| **Horario Nathy (24h)** | 👁️ **Solo Lectura** (Visualiza sin alterar) | ✏️ **Editar** (Pintar celdas, atajos) | **Individual Nathy** |
| **Ingreso Económico Individual** | ✏️ Edita su ingreso (S/. 2,500) | ✏️ Edita su ingreso (S/. 2,000) | **Individual** |
| **Estado de Ánimo / Pensamiento** | ✏️ Actualiza el de Juan | ✏️ Actualiza el de Nathy | **Individual** |
| **PIN de Acceso y Perfil** | ✏️ Modifica su propio PIN y apodo | ✏️ Modifica su propio PIN y apodo | **Individual** |
| **Horarios 24h & Comparador** | 👥 Modificable / Filtros por día | 👥 Modificable / Filtros por día | **Conjunto** |
| **Presupuesto de Viaje & Gastos** | 👥 Añadir, pagar o borrar gastos | 👥 Añadir, pagar o borrar gastos | **Conjunto** |
| **Meta de Ahorro del Reencuentro** | 👥 Actualizar fondo acumulado | 👥 Actualizar fondo acumulado | **Conjunto** |
| **Vision Board & Checklist** | 👥 Marcar tareas, crear hitos | 👥 Marcar tareas, crear hitos | **Conjunto** |
| **Agenda de Citas Virtuales** | 👥 Agendar citas, cambiar estado | 👥 Agendar citas, cambiar estado | **Conjunto** |
| **Bóveda de Citas & Ruleta** | 👥 Girar ruleta, proponer ideas | 👥 Girar ruleta, proponer ideas | **Conjunto** |
| **Buzón de Cartas y Amor** | 💌 Enviar cartas con su firma | 💌 Enviar cartas con su firma | **Conjunto** |
| **Temas Visuales & Configuración** | 🎨 Cambiar temas y parámetros | 🎨 Cambiar temas y parámetros | **Conjunto** |

---

## 🎨 3. Personalización Total & Temas Visuales

- **5 Temas Visuales Integrados:**
  1. 🌸 **Sunset Rose** (Rosa, frambuesa y violeta pastel) - *Por defecto*
  2. 💜 **Midnight Violet** (Lavanda e índigo profundo)
  3. 🌊 **Ocean Breeze** (Cian, turquesa y azul cielo)
  4. 🌿 **Sage Garden** (Verde menta y eucalipto fresco)
  5. 🌙 **Dark Romance** (Modo oscuro aterciopelado con acentos de neón)
- **Editor de Categorías de Horario:** Posibilidad de crear nuevas categorías, cambiar sus colores con selector visual de color HTML, íconos y reglas de interacción.
- **Contador de Aniversario:** Muestra automáticamente cuántos días llevan juntos de novios con la fecha de inicio configurada.
- **Lema y Canción de la Pareja:** Frase personalizada visible en la cabecera.

---

## 🌟 4. Solución a los 4 Fallos e Inconsistencias Detectadas en la Documentación

1. **Corrección de Mezcla de Monedas (PEN vs USD)**:
   - Los ingresos se capturan en Soles (`S/. 2,500.00` y `S/. 2,000.00`), calculando la proporción equitativa exacta (**55.6% Juan / 44.4% Nathy**).
   - Se incorpora un conversor de tipo de cambio paramétrico (1 USD = 3.75 PEN) que desglosa automáticamente cada partida de gastos del viaje tanto en Dólares como en Soles con la cuota exacta de cada uno.

2. **Ampliación Completa a 24 Horas (00:00 a 23:00)**:
   - Se completaron las 24 horas del día (los 7 días de la semana, 168 horas totales).
   - El cálculo de KPIs ahora es matemáticamente exacto: **27 horas libres coincidentes + 14 horas de citas/llamadas = 41 horas de conexión semanal (24.4% de compatibilidad semanal y 5.9 h/día)**, coincidiendo exactamente con el diagnóstico *"✨ Excelente Tiempo Juntos"*.

3. **Checklist Sincronizado**:
   - Casillas de verificación reactivas vinculadas al estado real ("¡Listo! Confirmado", "En proceso", "Pendiente") con barra de progreso porcentual dinámica.

4. **Cuenta Regresiva en Tiempo Real**:
   - Temporizador en vivo que descuenta cada segundo hacia el **20 de Noviembre de 2026 a las 18:00 hrs**, mostrando Días, Horas, Minutos, Segundos y Semanas restantes.

---

## 📦 5. Exportación e Importación de Datos

- **Exportar a Excel (.xlsx)**: Genera al vuelo un libro de cálculo con **8 hojas formateadas** que representan fielmente cada sección técnica y los nombres personalizados (`/api/export/excel`).
- **Exportar a JSON**: Descarga una copia de seguridad íntegra de todos los datos (`/api/export/json`).
- **Importar JSON**: Restaura al instante una copia de seguridad desde el modal de la interfaz (`/api/import`).
- **Guardado en Servidor**: El botón "Guardar" persiste los cambios en `data/database.json`.
# repohorario
