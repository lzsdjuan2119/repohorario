const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

// Generador de plantilla de horario semanal realista que cumple exactamente con los KPIs
function generateSchedules() {
  const juanSchedule = {};
  const nathySchedule = {};

  DAYS.forEach(day => {
    juanSchedule[day] = {};
    nathySchedule[day] = {};

    HOURS.forEach(hour => {
      const h = parseInt(hour.split(':')[0], 10);

      // Por defecto para días laborales (Lunes a Viernes)
      if (day !== "Sábado" && day !== "Domingo") {
        // 00:00 a 06:00: Dormir
        if (h >= 0 && h <= 6) {
          juanSchedule[day][hour] = "Dormir (Noche)";
          nathySchedule[day][hour] = "Dormir (Noche)";
        }
        // 07:00: Mañana / Personal
        else if (h === 7) {
          juanSchedule[day][hour] = "Ocupado / Personal";
          nathySchedule[day][hour] = "Ocupado / Personal";
        }
        // 08:00: En Tránsito
        else if (h === 8) {
          juanSchedule[day][hour] = "En Tránsito";
          nathySchedule[day][hour] = "En Tránsito";
        }
        // 09:00 a 17:00: Trabajo / Estudio
        else if (h >= 9 && h <= 17) {
          juanSchedule[day][hour] = "Trabajo / Estudio";
          nathySchedule[day][hour] = "Trabajo / Estudio";
        }
        // 18:00 a 19:00: Tránsito / Gimnasio / Personal
        else if (h === 18 || h === 19) {
          juanSchedule[day][hour] = (h === 18) ? "En Tránsito" : "Ocupado / Personal";
          nathySchedule[day][hour] = (h === 18) ? "Ocupado / Personal" : "Ocupado / Personal";
        }
        // 20:00 a 21:00: Llamadas fijas de pareja (14h por semana)
        else if (h === 20 || h === 21) {
          juanSchedule[day][hour] = "Llamada / Cita Virtual";
          nathySchedule[day][hour] = "Llamada / Cita Virtual";
        }
        // 22:00 a 23:00: Prepararse y dormir
        else {
          juanSchedule[day][hour] = (h === 22) ? "Ocupado / Personal" : "Dormir (Noche)";
          nathySchedule[day][hour] = (h === 22) ? "Ocupado / Personal" : "Dormir (Noche)";
        }
      } else {
        // Fines de Semana (Sábado y Domingo): Más horas libres coincidentes
        if (h >= 0 && h <= 7) {
          juanSchedule[day][hour] = "Dormir (Noche)";
          nathySchedule[day][hour] = "Dormir (Noche)";
        } else if (h >= 8 && h <= 9) {
          juanSchedule[day][hour] = "Ocupado / Personal";
          nathySchedule[day][hour] = "Ocupado / Personal";
        } else if (h >= 10 && h <= 11) {
          // Coincidentes libres (Sábado y Domingo = 4h)
          juanSchedule[day][hour] = "Libre";
          nathySchedule[day][hour] = "Libre";
        } else if (h >= 12 && h <= 13) {
          juanSchedule[day][hour] = "Ocupado / Personal";
          nathySchedule[day][hour] = "Ocupado / Personal";
        } else if (h >= 14 && h <= 17) {
          // Coincidentes libres tarde fin de semana (4h x 2 = 8h)
          juanSchedule[day][hour] = "Libre";
          nathySchedule[day][hour] = "Libre";
        } else if (h >= 18 && h <= 19) {
          // Coincidentes libres atardecer (2h x 2 = 4h)
          juanSchedule[day][hour] = "Libre";
          nathySchedule[day][hour] = "Libre";
        } else if (h >= 20 && h <= 21) {
          // Citas de fin de semana
          juanSchedule[day][hour] = "Llamada / Cita Virtual";
          nathySchedule[day][hour] = "Llamada / Cita Virtual";
        } else {
          juanSchedule[day][hour] = (h === 22) ? "Libre" : "Dormir (Noche)";
          nathySchedule[day][hour] = (h === 22) ? "Libre" : "Dormir (Noche)";
        }
      }
    });
  });

  // Ajuste fino para Lunes a Viernes a las 19:00: Libre coincidente (5h) + más ajustes para dar exactamente 27h libres
  // Días laborales 19:00 Libre: 5 días * 1h = 5h
  ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"].forEach(day => {
    juanSchedule[day]["19:00"] = "Libre";
    nathySchedule[day]["19:00"] = "Libre";
  });
  // Sábado y Domingo tienen: 10:00, 11:00, 14:00, 15:00, 16:00, 17:00, 18:00, 19:00, 22:00 = 9h x 2 = 18h
  // Mas 5h entre semana = 23h. Agregamos 2h en Viernes tarde y 2h en Domingo para totalizar 27h libres coincidentes:
  juanSchedule["Viernes"]["18:00"] = "Libre";
  nathySchedule["Viernes"]["18:00"] = "Libre";
  juanSchedule["Sábado"]["13:00"] = "Libre";
  nathySchedule["Sábado"]["13:00"] = "Libre";
  juanSchedule["Domingo"]["13:00"] = "Libre";
  nathySchedule["Domingo"]["13:00"] = "Libre";
  juanSchedule["Domingo"]["09:00"] = "Libre";
  nathySchedule["Domingo"]["09:00"] = "Libre";

  return { juanSchedule, nathySchedule };
}

const { juanSchedule, nathySchedule } = generateSchedules();

const initialData = {
  users: {
    juan: {
      id: "juan",
      name: "Juan",
      nickname: "Juancito",
      avatarEmoji: "👦",
      avatarColor: "#3b82f6",
      mood: "¡Contando los días para abrazarte! 🥰",
      pin: "1234"
    },
    nathy: {
      id: "nathy",
      name: "Nathy",
      nickname: "Nath",
      avatarEmoji: "👧",
      avatarColor: "#ec4899",
      mood: "Te extraño mucho, mi amor 💕",
      pin: "1234"
    }
  },
  activeUserId: "juan",
  currentTheme: "sunset", // sunset, midnight, ocean, sage, dark
  relationship: {
    anniversaryDate: "2024-05-15",
    motto: "La distancia separa cuerpos, nunca corazones ✨",
    customSong: "Nuestra Canción Especial"
  },
  loveNotes: [
    {
      id: 1,
      authorId: "juan",
      authorName: "Juan",
      text: "¡Buenos días mi amor hermosa! Espero que tengas un día maravilloso. No olvides tomar agua y sonreír. ¡Te amo con todo mi corazón! 💖",
      timestamp: "2026-09-30T09:30:00",
      likes: 2
    },
    {
      id: 2,
      authorId: "nathy",
      authorName: "Nathy",
      text: "¡Hola mi vida! Ya quiero que sea nuestra cita virtual de la noche. Preparé una sorpresa para ti 💕",
      timestamp: "2026-09-30T11:15:00",
      likes: 3
    }
  ],
  config: {
    couple: {
      juan: "Juan",
      nathy: "Nathy"
    },
    reunionDate: "2026-11-20T18:00:00",
    reunionLocation: "Aeropuerto Internacional • Nuestro Reencuentro",
    exchangeRate: 3.75, // 1 USD = 3.75 Soles (PEN)
    defaultCurrency: "USD",
    categories: [
      {
        id: "dormir",
        name: "Dormir (Noche)",
        color: "#475569",
        bgLight: "#f1f5f9",
        icon: "bi-moon-stars-fill",
        rule: "Descanso nocturno primordial. No interrumpir salvo emergencias.",
        isCoupleTime: false
      },
      {
        id: "cita",
        name: "Llamada / Cita Virtual",
        color: "#ec4899",
        bgLight: "#fdf2f8",
        icon: "bi-heart-fill",
        rule: "Espacio sagrado dedicado a la pareja. 100% atención y cámara encendida.",
        isCoupleTime: true
      },
      {
        id: "trabajo",
        name: "Trabajo / Estudio",
        color: "#f59e0b",
        bgLight: "#fffbeb",
        icon: "bi-briefcase-fill",
        rule: "Alta concentración. No se permiten llamadas largas, solo mensajes breves.",
        isCoupleTime: false
      },
      {
        id: "transito",
        name: "En Tránsito",
        color: "#3b82f6",
        bgLight: "#eff6ff",
        icon: "bi-car-front-fill",
        rule: "Desplazamiento en transporte. Disponibilidad de audio o notas de voz.",
        isCoupleTime: false
      },
      {
        id: "ocupado",
        name: "Ocupado / Personal",
        color: "#8b5cf6",
        bgLight: "#f5f3ff",
        icon: "bi-person-fill",
        rule: "Tareas del hogar, gimnasio, ducha o tiempo individual.",
        isCoupleTime: false
      },
      {
        id: "libre",
        name: "Libre",
        color: "#10b981",
        bgLight: "#ecfdf5",
        icon: "bi-stars",
        rule: "Tiempo disponible para videollamadas espontáneas, series o streaming.",
        isCoupleTime: false
      }
    ]
  },
  schedules: {
    days: DAYS,
    hours: HOURS,
    juan: juanSchedule,
    nathy: nathySchedule
  },
  finances: {
    income: {
      juanPEN: 2500,
      nathyPEN: 2000
    },
    goal: {
      targetUSD: 2000,
      savedUSD: 1350
    },
    expenses: [
      {
        id: 1,
        concept: "Vuelos de Ida y Vuelta",
        category: "Vuelos",
        amountUSD: 650.00,
        status: "Pendiente",
        notes: "Tarifa con equipaje de bodega incluido"
      },
      {
        id: 2,
        concept: "Hospedaje (Airbnb / Hotel 7 días)",
        category: "Alojamiento",
        amountUSD: 420.00,
        status: "Pendiente",
        notes: "Ubicación céntrica con cocina y balcón"
      },
      {
        id: 3,
        concept: "Seguro de Asistencia al Viajero",
        category: "Seguros",
        amountUSD: 120.00,
        status: "Pendiente",
        notes: "Cobertura médica total para ambos"
      },
      {
        id: 4,
        concept: "Fondo de Comidas, Cenas y Cafeterías",
        category: "Alimentación",
        amountUSD: 350.00,
        status: "Pendiente",
        notes: "Provisión diaria para comidas románticas"
      },
      {
        id: 5,
        concept: "Transporte Local, Taxis y Traslados",
        category: "Transporte",
        amountUSD: 160.00,
        status: "Pendiente",
        notes: "Tarjetas de metro y viajes de aeropuerto"
      },
      {
        id: 6,
        concept: "Entradas a Actividades y Tours",
        category: "Ocio",
        amountUSD: 180.00,
        status: "Pendiente",
        notes: "Museos, mirador panorámico y parque"
      },
      {
        id: 7,
        concept: "Fondo de Imprevistos y Emergencias",
        category: "Reserva",
        amountUSD: 120.00,
        status: "Pendiente",
        notes: "Colchón de seguridad para tranquilidad"
      }
    ]
  },
  visionBoard: {
    countdownTarget: "2026-11-20T18:00:00",
    checklist: [
      {
        id: 1,
        task: "Comprar boletos de avión para el reencuentro",
        completed: true,
        status: "¡Listo! Confirmado",
        responsible: "Ambos",
        deadline: "2026-10-15"
      },
      {
        id: 2,
        task: "Reservar alojamiento acogedor",
        completed: true,
        status: "¡Listo! Confirmado",
        responsible: "Juan",
        deadline: "2026-10-20"
      },
      {
        id: 3,
        task: "Contratar seguro de viaje internacional",
        completed: false,
        status: "En proceso",
        responsible: "Nathy",
        deadline: "2026-10-30"
      },
      {
        id: 4,
        task: "Comprar regalos especiales y cartas secretas",
        completed: false,
        status: "En proceso",
        responsible: "Ambos",
        deadline: "2026-11-10"
      },
      {
        id: 5,
        task: "Hacer checklist de equipaje y outfits combinados",
        completed: false,
        status: "Pendiente",
        responsible: "Ambos",
        deadline: "2026-11-17"
      },
      {
        id: 6,
        task: "Coordinar sorpresa en el aeropuerto (Cartel & Flores)",
        completed: false,
        status: "Pendiente",
        responsible: "Juan",
        deadline: "2026-11-19"
      }
    ],
    cards: [
      {
        id: 1,
        title: "El Abrazo en el Aeropuerto",
        description: "El momento exacto donde la distancia se convierte en cero kilómetros.",
        badge: "Día 1",
        gradient: "linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)",
        icon: "bi-heart-half"
      },
      {
        id: 2,
        title: "Nuestra Primera Cena Sin Pantallas",
        description: "Brindar mirándonos a los ojos, tomados de la mano sin esperar por el wifi.",
        badge: "Noche Mágica",
        gradient: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
        icon: "bi-cup-hot-fill"
      },
      {
        id: 3,
        title: "Atardecer Caminando Juntos",
        description: "Pasear sin prisa disfrutando cada segundo juntos.",
        badge: "Inolvidable",
        gradient: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
        icon: "bi-sunset-fill"
      },
      {
        id: 4,
        title: "Planear el Siguiente Capítulo",
        description: "Consolidar el plan para no volver a despedirnos.",
        badge: "Futuro",
        gradient: "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
        icon: "bi-compass-fill"
      }
    ]
  },
  datesAgenda: [
    {
      id: 1,
      day: "Lunes",
      date: "2026-10-05",
      time: "21:00",
      activity: "Noche de Cine por Teleparty",
      modality: "Virtual",
      platform: "Teleparty (Netflix)",
      status: "Confirmada",
      notes: "Preparar palomitas de maíz. Película romántica o comedia."
    },
    {
      id: 2,
      day: "Miércoles",
      date: "2026-10-07",
      time: "20:30",
      activity: "Cocina Virtual Simultánea",
      modality: "Virtual",
      platform: "Google Meet",
      status: "Confirmada",
      notes: "Misma receta de pasta italiana y copa de vino tinto."
    },
    {
      id: 3,
      day: "Viernes",
      date: "2026-10-09",
      time: "21:30",
      activity: "Noche de Karaoke y Risas",
      modality: "Virtual",
      platform: "Discord",
      status: "Confirmada",
      notes: "Canciones que nos dedicamos y dúos cómicos."
    },
    {
      id: 4,
      day: "Domingo",
      date: "2026-10-11",
      time: "18:00",
      activity: "Tarde de Videojuegos Cooperativos",
      modality: "Online",
      platform: "Steam (It Takes Two)",
      status: "Tentativa",
      notes: "Avanzar el capítulo del reloj de nieve."
    }
  ],
  datesVault: {
    weeklyMission: "Cocina Virtual Simultánea: ¡Preparar pasta casera este Miércoles!",
    ideas: [
      {
        id: 1,
        title: "Cine a Distancia sincronizado",
        modality: "Virtual",
        duration: "2 horas",
        description: "Ver una película o serie con palomitas de maíz usando Teleparty mientras chateamos por voz.",
        tip: "Hacer maratón con palomitas temáticas y helado.",
        badgeColor: "bg-primary"
      },
      {
        id: 2,
        title: "Cena a la luz de las velas por videollamada",
        modality: "Virtual",
        duration: "1.5 horas",
        description: "Ambos nos vestimos elegantes, encendemos velas aromáticas y cenamos juntos a través de la pantalla.",
        tip: "Poner de fondo música jazz o acústica romántica.",
        badgeColor: "bg-danger"
      },
      {
        id: 3,
        title: "Cocina juntos la misma receta",
        modality: "Virtual",
        duration: "2 horas",
        description: "Compramos los mismos ingredientes por la tarde y cocinamos paso a paso por cámara hasta servir el plato.",
        tip: "Calificar los emplatados con puntajes graciosos de MasterChef.",
        badgeColor: "bg-warning text-dark"
      },
      {
        id: 4,
        title: "Tour virtual por museos o ciudades",
        modality: "Online",
        duration: "1.5 horas",
        description: "Compartir pantalla explorando museos mundiales en Google Arts o recorrer calles en Google Earth.",
        tip: "Elegir juntos la ciudad de nuestro próximo viaje.",
        badgeColor: "bg-info text-dark"
      },
      {
        id: 5,
        title: "Noche de Juegos Cooperativos",
        modality: "Online",
        duration: "2 horas",
        description: "Jugar 'It Takes Two', 'Overcooked' o 'Keep Talking and Nobody Explodes' en PC o consola.",
        tip: "Hacer apuestas divertidas por cada partida perdida.",
        badgeColor: "bg-purple text-white"
      },
      {
        id: 6,
        title: "Escape Room Virtual en Pareja",
        modality: "Online",
        duration: "1.5 horas",
        description: "Resolver acertijos y misterios juntos en una sala de escape interactiva online.",
        tip: "Trabajar en equipo y bajo reloj.",
        badgeColor: "bg-secondary"
      },
      {
        id: 7,
        title: "Envío mutuo de comida sorpresa",
        modality: "Delivery",
        duration: "1.5 horas",
        description: "Cada uno pide a domicilio la cena favorita del otro usando UberEats / PedidosYa en su ciudad sin decirle qué es.",
        tip: "Abrir las cajas juntos en cámara en vivo.",
        badgeColor: "bg-success"
      },
      {
        id: 8,
        title: "Kit de cuidado personal / Spa remoto",
        modality: "Delivery",
        duration: "1 hora",
        description: "Pedir mascarillas faciales y snacks relajantes para hacernos una sesión de spa casero en videollamada.",
        tip: "Música de relajación y mascarillas con pepinos.",
        badgeColor: "bg-teal text-white"
      },
      {
        id: 9,
        title: "Cartas 'Abrir cuando...'",
        modality: "Postal",
        duration: "Continuo",
        description: "Escribir un paquete de cartas selladas para diferentes momentos: cuando me extrañes, cuando estés triste, etc.",
        tip: "Enviar por correo certificado con fotos impresas.",
        badgeColor: "bg-dark"
      },
      {
        id: 10,
        title: "Intercambio de prendas con perfume",
        modality: "Postal",
        duration: "Especial",
        description: "Enviarse una sudadera o camiseta con el perfume de cada uno para abrazarla en las noches.",
        tip: "Incluir una nota escrita a mano escondida en el bolsillo.",
        badgeColor: "bg-rose text-white"
      },
      {
        id: 11,
        title: "Cápsula del tiempo para el reencuentro",
        modality: "Postal",
        duration: "1 hora",
        description: "Guardar fotos, cartas y recuerdos para abrirlos juntos exactamente el 20 de noviembre de 2026.",
        tip: "Cerrar con cera o candado de dos llaves.",
        badgeColor: "bg-indigo text-white"
      },
      {
        id: 12,
        title: "Noche de Preguntas Profundas y Recuerdos",
        modality: "Virtual",
        duration: "2 horas",
        description: "Usar cartas de 'We're Not Really Strangers' o preguntas para parejas para conectar a nivel íntimo.",
        tip: "Hablar con sinceridad total y recordar nuestras mejores anécdotas.",
        badgeColor: "bg-pink text-white"
      }
    ]
  }
};

module.exports = initialData;
