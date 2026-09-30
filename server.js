const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const initialData = require('./data/initialData');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'database.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar base de datos si no existe
function getDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error leyendo base de datos, usando datos iniciales:', err);
  }
  // Guardar datos iniciales
  saveDatabase(initialData);
  return JSON.parse(JSON.stringify(initialData));
}

function saveDatabase(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error guardando base de datos:', err);
    return false;
  }
}

// -------------------------------------------------------------
// RUTAS DE LA API
// -------------------------------------------------------------

// Endpoint de inicio de sesión con PIN
app.post('/api/login', (req, res) => {
  const { userId, pin } = req.body;
  const db = getDatabase();
  const user = db.users ? db.users[userId] : null;

  if (!user) {
    return res.status(400).json({ success: false, message: 'Usuario no encontrado' });
  }

  const expectedPin = user.pin || '1234';
  if (pin !== expectedPin) {
    return res.status(401).json({ success: false, message: 'PIN incorrecto. Por defecto es 1234.' });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      nickname: user.nickname,
      avatarEmoji: user.avatarEmoji,
      avatarColor: user.avatarColor
    },
    token: `couple_token_${user.id}_${Date.now()}`
  });
});

// Cambiar PIN del usuario activo
app.post('/api/change-pin', (req, res) => {
  const { userId, currentPin, newPin } = req.body;
  const db = getDatabase();
  const user = db.users ? db.users[userId] : null;

  if (!user) {
    return res.status(400).json({ success: false, message: 'Usuario no encontrado' });
  }

  const expectedPin = user.pin || '1234';
  if (currentPin !== expectedPin) {
    return res.status(401).json({ success: false, message: 'El PIN actual no coincide.' });
  }

  if (!newPin || newPin.length < 4) {
    return res.status(400).json({ success: false, message: 'El nuevo PIN debe tener al menos 4 dígitos.' });
  }

  user.pin = newPin;
  saveDatabase(db);
  res.json({ success: true, message: '¡PIN actualizado exitosamente!' });
});

// Obtener todos los datos
app.get('/api/data', (req, res) => {
  const data = getDatabase();
  res.json({ success: true, data });
});

// Guardar todos los datos
app.post('/api/data', (req, res) => {
  const newData = req.body;
  if (!newData || !newData.schedules) {
    return res.status(400).json({ success: false, message: 'Datos inválidos' });
  }
  saveDatabase(newData);
  res.json({ success: true, message: 'Datos guardados correctamente' });
});

// Restablecer a valores iniciales
app.post('/api/reset', (req, res) => {
  saveDatabase(initialData);
  res.json({ success: true, message: 'Datos restablecidos a los valores por defecto', data: initialData });
});

// Exportar como JSON
app.get('/api/export/json', (req, res) => {
  const data = getDatabase();
  const filename = `horario_juan_nathy_backup_${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader('Content-disposition', `attachment; filename=${filename}`);
  res.setHeader('Content-type', 'application/json');
  res.send(JSON.stringify(data, null, 2));
});

// Importar datos desde JSON
app.post('/api/import', (req, res) => {
  try {
    const importedData = req.body;
    if (!importedData || !importedData.schedules || !importedData.finances) {
      return res.status(400).json({ success: false, message: 'Estructura de archivo inválida. Falta horarios o finanzas.' });
    }
    saveDatabase(importedData);
    res.json({ success: true, message: '¡Datos importados con éxito!', data: importedData });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error procesando la importación: ' + err.message });
  }
});

// Exportar libro completo a Excel (.xlsx) con 8 pestañas formateadas
app.get('/api/export/excel', (req, res) => {
  try {
    const data = getDatabase();
    const wb = XLSX.utils.book_new();

    const juanName = data.users?.juan?.name || data.config?.couple?.juan || 'Juan';
    const nathyName = data.users?.nathy?.name || data.config?.couple?.nathy || 'Nathy';

    // 1. Pestaña: Horario Juan
    const juanRows = [];
    juanRows.push(['Hora', ...data.schedules.days]);
    data.schedules.hours.forEach(hour => {
      const row = [hour];
      data.schedules.days.forEach(day => {
        row.push(data.schedules.juan[day][hour] || 'Libre');
      });
      juanRows.push(row);
    });
    const wsJuan = XLSX.utils.aoa_to_sheet(juanRows);
    XLSX.utils.book_append_sheet(wb, wsJuan, `Horario ${juanName}`);

    // 2. Pestaña: Horario Nathy
    const nathyRows = [];
    nathyRows.push(['Hora', ...data.schedules.days]);
    data.schedules.hours.forEach(hour => {
      const row = [hour];
      data.schedules.days.forEach(day => {
        row.push(data.schedules.nathy[day][hour] || 'Libre');
      });
      nathyRows.push(row);
    });
    const wsNathy = XLSX.utils.aoa_to_sheet(nathyRows);
    XLSX.utils.book_append_sheet(wb, wsNathy, `Horario ${nathyName}`);

    // 3. Pestaña: Horarios 24h (Comparativo Lado a Lado)
    const compRows = [];
    compRows.push(['Hora', ...data.schedules.days.flatMap(day => [`${day} (${juanName})`, `${day} (${nathyName})`, `${day} (Estado)`])]);
    data.schedules.hours.forEach(hour => {
      const row = [hour];
      data.schedules.days.forEach(day => {
        const j = data.schedules.juan[day][hour];
        const n = data.schedules.nathy[day][hour];
        let status = 'Diferente';
        if (j === 'Libre' && n === 'Libre') status = '✨ Ambos Libres';
        else if (j === 'Llamada / Cita Virtual' && n === 'Llamada / Cita Virtual') status = '💖 Cita / Llamada';
        else if (j === n) status = `Coincide (${j})`;
        row.push(j, n, status);
      });
      compRows.push(row);
    });
    const wsComp = XLSX.utils.aoa_to_sheet(compRows);
    XLSX.utils.book_append_sheet(wb, wsComp, 'Horarios 24h');

    // 4. Pestaña: Finanzas y Vuelos
    const fin = data.finances;
    const rate = data.config.exchangeRate || 3.75;
    const totalPEN = fin.income.juanPEN + fin.income.nathyPEN;
    const juanPct = ((fin.income.juanPEN / totalPEN) * 100).toFixed(1);
    const nathyPct = ((fin.income.nathyPEN / totalPEN) * 100).toFixed(1);

    const finRows = [
      ['RESUMEN DE INGRESOS Y APORTES PROPORCIONALES'],
      ['Persona', 'Ingreso (Soles PEN)', 'Equivalente (USD)', 'Proporción Aporte %'],
      [juanName, fin.income.juanPEN, +(fin.income.juanPEN / rate).toFixed(2), `${juanPct}%`],
      [nathyName, fin.income.nathyPEN, +(fin.income.nathyPEN / rate).toFixed(2), `${nathyPct}%`],
      ['Total', totalPEN, +(totalPEN / rate).toFixed(2), '100%'],
      [],
      ['META DE REENCUENTRO'],
      ['Meta Total USD', 'Ahorro Acumulado USD', 'Faltante USD', '% Completado'],
      [fin.goal.targetUSD, fin.goal.savedUSD, fin.goal.targetUSD - fin.goal.savedUSD, `${((fin.goal.savedUSD / fin.goal.targetUSD) * 100).toFixed(1)}%`],
      [],
      ['DESGLOSE DETALLADO DE GASTOS DEL VIAJE'],
      ['Concepto', 'Categoría', 'Total USD', 'Total Soles (PEN)', `Aporte ${juanName} USD`, `Aporte ${nathyName} USD`, 'Estado', 'Notas']
    ];

    fin.expenses.forEach(exp => {
      const pen = +(exp.amountUSD * rate).toFixed(2);
      const jUsd = +((exp.amountUSD * fin.income.juanPEN) / totalPEN).toFixed(2);
      const nUsd = +((exp.amountUSD * fin.income.nathyPEN) / totalPEN).toFixed(2);
      finRows.push([exp.concept, exp.category, exp.amountUSD, pen, jUsd, nUsd, exp.status, exp.notes || '']);
    });

    const wsFin = XLSX.utils.aoa_to_sheet(finRows);
    XLSX.utils.book_append_sheet(wb, wsFin, 'Finanzas y Vuelos');

    // 5. Pestaña: Vision Board & Cuenta Regresiva
    const vbRows = [
      ['OBJETIVO DEL REENCUENTRO'],
      ['Fecha Objetivo', data.config.reunionDate],
      ['Lugar', data.config.reunionLocation],
      [],
      ['CHECKLIST DE PREPARATIVOS'],
      ['ID', 'Tarea', 'Completado', 'Estado Oficial', 'Responsable', 'Fecha Límite']
    ];
    data.visionBoard.checklist.forEach(item => {
      vbRows.push([item.id, item.task, item.completed ? 'SÍ' : 'NO', item.status, item.responsible, item.deadline]);
    });
    const wsVB = XLSX.utils.aoa_to_sheet(vbRows);
    XLSX.utils.book_append_sheet(wb, wsVB, 'Vision Board & Regresiva');

    // 6. Pestaña: Agenda de Citas
    const agendaRows = [
      ['CRONOGRAMA DE CITAS VIRTUALES'],
      ['Día', 'Fecha', 'Hora', 'Actividad', 'Modalidad', 'Plataforma', 'Estado', 'Notas']
    ];
    data.datesAgenda.forEach(item => {
      agendaRows.push([item.day, item.date, item.time, item.activity, item.modality, item.platform, item.status, item.notes]);
    });
    const wsAgenda = XLSX.utils.aoa_to_sheet(agendaRows);
    XLSX.utils.book_append_sheet(wb, wsAgenda, 'Agenda de Citas');

    // 7. Pestaña: Bóveda de Citas
    const bovedaRows = [
      ['MISIÓN SEMANAL:', data.datesVault.weeklyMission],
      [],
      ['BANCO DE IDEAS PARA CITAS A DISTANCIA'],
      ['Título', 'Modalidad', 'Duración Estimada', 'Descripción', 'Consejo Especial']
    ];
    data.datesVault.ideas.forEach(item => {
      bovedaRows.push([item.title, item.modality, item.duration, item.description, item.tip]);
    });
    const wsBoveda = XLSX.utils.aoa_to_sheet(bovedaRows);
    XLSX.utils.book_append_sheet(wb, wsBoveda, 'Boveda de Citas');

    // 8. Pestaña: Configuración
    const confRows = [
      ['CATÁLOGO DE ESTADOS DE HORARIO'],
      ['Nombre Estado', 'Color Hex', 'Regla de Interacción'],
      ...data.config.categories.map(c => [c.name, c.color, c.rule]),
      [],
      ['PARÁMETROS GENERALES Y PAREJA'],
      ['Pareja', `${juanName} & ${nathyName}`],
      ['Apodos', `${data.users?.juan?.nickname || 'Juancito'} & ${data.users?.nathy?.nickname || 'Nath'}`],
      ['Fecha de Aniversario', data.relationship?.anniversaryDate || '2024-05-15'],
      ['Lema de la Pareja', data.relationship?.motto || 'La distancia separa cuerpos, nunca corazones ✨'],
      ['Tipo de Cambio USD / PEN', data.config.exchangeRate],
      ['Moneda por Defecto', data.config.defaultCurrency]
    ];
    const wsConf = XLSX.utils.aoa_to_sheet(confRows);
    XLSX.utils.book_append_sheet(wb, wsConf, 'Configuración');

    // Escribir buffer y descargar
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `Horario_y_Todo_Juan_y_Nathy_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Error generando Excel:', err);
    res.status(500).json({ success: false, message: 'Error al generar Excel: ' + err.message });
  }
});

// Resumen Mensual consolidado
app.get('/api/summary/monthly', (req, res) => {
  const data = getDatabase();

  // Calcular horas de conexión semanal
  let coincidentFree = 0;
  let dateHours = 0;
  const totalWeeklyHours = 7 * 24; // 168

  data.schedules.days.forEach(day => {
    data.schedules.hours.forEach(hour => {
      const j = data.schedules.juan[day][hour];
      const n = data.schedules.nathy[day][hour];
      if (j === 'Libre' && n === 'Libre') coincidentFree++;
      if (j === 'Llamada / Cita Virtual' && n === 'Llamada / Cita Virtual') dateHours++;
    });
  });

  const totalConnectionHours = coincidentFree + dateHours;
  const compatibilityPct = +((totalConnectionHours / totalWeeklyHours) * 100).toFixed(1);
  const monthlyProjectedHours = +(totalConnectionHours * 4.33).toFixed(1); // 4.33 semanas al mes

  // Finanzas
  const totalIncomePEN = data.finances.income.juanPEN + data.finances.income.nathyPEN;
  const targetUSD = data.finances.goal.targetUSD;
  const savedUSD = data.finances.goal.savedUSD;
  const savingsPct = +((savedUSD / targetUSD) * 100).toFixed(1);
  const remainingUSD = +(targetUSD - savedUSD).toFixed(2);

  // Gastos totales proyectados
  const totalExpensesUSD = data.finances.expenses.reduce((acc, curr) => acc + (curr.amountUSD || 0), 0);

  // Checklist reencuentro
  const totalTasks = data.visionBoard.checklist.length;
  const completedTasks = data.visionBoard.checklist.filter(t => t.completed).length;
  const checklistPct = +((completedTasks / totalTasks) * 100).toFixed(1);

  // Citas agendadas
  const totalDates = data.datesAgenda.length;
  const confirmedDates = data.datesAgenda.filter(d => d.status === 'Confirmada').length;

  res.json({
    success: true,
    summary: {
      weekly: {
        coincidentFree,
        dateHours,
        totalConnectionHours,
        dailyAverage: +(totalConnectionHours / 7).toFixed(1),
        compatibilityPct,
        diagnosis: totalConnectionHours >= 35 ? '✨ Excelente Tiempo Juntos' : (totalConnectionHours >= 20 ? '💛 Buen Ritmo' : '⚠️ Atención: Poca Conexión')
      },
      monthly: {
        projectedConnectionHours: monthlyProjectedHours,
        targetMonthlyHours: 160,
        hoursProgressPct: Math.min(100, +((monthlyProjectedHours / 160) * 100).toFixed(1))
      },
      finances: {
        totalIncomePEN,
        targetUSD,
        savedUSD,
        savingsPct,
        remainingUSD,
        totalExpensesUSD,
        exchangeRate: data.config.exchangeRate
      },
      checklist: {
        totalTasks,
        completedTasks,
        checklistPct
      },
      dates: {
        totalDates,
        confirmedDates
      }
    }
  });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🌸 Horario y Todo - Juan & Nathy Web App`);
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`====================================================`);
});
