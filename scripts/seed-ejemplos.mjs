// Cursos de ejemplo para ver cómo funciona la plataforma. Se puede ejecutar varias veces:
// borra y vuelve a crear los cursos cuyo título termina en "(Ejemplo)" o "(Borrador de ejemplo)".
//
//   DATABASE_URL=postgresql://... node scripts/seed-ejemplos.mjs [--archivos] [--inscribir]
//
//   --archivos   sube la imagen y el PDF de ejemplo al bucket (requiere gcloud con sesión iniciada)
//   --inscribir  inscribe a todas las cuentas existentes en los cursos publicados
//
// El contenido es referencial: debe revisarlo el área responsable antes de usarlo con personal real.
import { execFileSync } from "node:child_process";
import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const BUCKET = process.env.MEDIA_BUCKET ?? "capacitaciongemeseg-media";
const connectionString = process.env.DATABASE_URL ?? process.env.DB_URL;
if (!connectionString) throw new Error("Falta DATABASE_URL");

const cuid = () => `c${randomBytes(12).toString("hex")}`;
const NOTE = "\n\n(Curso de ejemplo para conocer la plataforma. El contenido es referencial: revíselo antes de usarlo con personal.)";

// ───────────── Preguntas ─────────────
const mix = (items) => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const single = (text, correct, wrongs) => ({
  type: "SINGLE_CHOICE",
  text,
  options: mix([{ text: correct, ok: true }, ...wrongs.map((w) => ({ text: w, ok: false }))]),
});
const multi = (text, corrects, wrongs) => ({
  type: "MULTIPLE_CHOICE",
  text,
  options: mix([...corrects.map((c) => ({ text: c, ok: true })), ...wrongs.map((w) => ({ text: w, ok: false }))]),
});
const tf = (text, value) => ({
  type: "TRUE_FALSE",
  text,
  options: [
    { text: "Verdadero", ok: value },
    { text: "Falso", ok: !value },
  ],
});
const text = (title, body) => ({ type: "TEXT", title, body });
const video = (title, url) => ({ type: "VIDEO_EMBED", title, url });
const link = (title, url) => ({ type: "LINK", title, url });
const image = (title, asset) => ({ type: "IMAGE", title, asset });
const file = (title, asset) => ({ type: "FILE", title, asset });

// ───────────── Cursos ─────────────
const courses = [
  {
    title: "Inducción a Gemeseg Seguridad (Ejemplo)",
    description:
      "Primer curso para el personal que ingresa: quiénes somos, cómo se trabaja en cada puesto y qué se espera de cada guardia." + NOTE,
    progression: "SEQUENTIAL",
    published: true,
    recertMonths: 12,
    due: 30,
    modules: [
      {
        title: "Conozca Gemeseg",
        subs: [
          {
            title: "Nuestra empresa y su misión",
            lessons: [
              text(
                "Qué hacemos y por qué importa",
                "Gemeseg Seguridad presta servicios de vigilancia y protección a empresas, conjuntos residenciales e instituciones. Cada puesto que cubrimos es un compromiso: las personas y los bienes de nuestros clientes dependen de que usted esté atento, presente y bien preparado.\n\nNuestra misión es proteger a las personas, los bienes y la información de nuestros clientes con personal capacitado, responsable y confiable.\n\nLos valores que guían el trabajo diario son:\n\n- Responsabilidad: cumplir el puesto y los horarios asignados.\n- Integridad: actuar con honestidad, incluso cuando nadie lo supervisa.\n- Respeto: trato cortés a clientes, visitantes y compañeros.\n- Prevención: anticiparse a los riesgos antes de que ocurran.",
              ),
              text(
                "Cadena de mando y a quién reportar",
                "En cada puesto existe una cadena de mando clara: el guardia reporta al supervisor de zona, este al jefe de operaciones y este a la gerencia. Reportar por el canal correcto evita confusiones y permite reaccionar a tiempo.\n\nReglas básicas:\n\n1. Toda novedad se reporta de inmediato a su supervisor, aunque parezca menor.\n2. Las solicitudes del cliente se atienden dentro de las consignas del puesto. Si una solicitud las contradice, consulte antes con el supervisor.\n3. Registre en la bitácora la hora, el hecho, las personas involucradas y lo que usted hizo.\n\nUna bitácora clara protege al guardia, al cliente y a la empresa.",
              ),
            ],
            quiz: {
              passing: 70,
              questions: [
                single("¿Qué debe hacer ante una novedad en su puesto, aunque parezca menor?", "Reportarla de inmediato a su supervisor y registrarla en la bitácora", [
                  "Esperar al cambio de turno para comentarla",
                  "Resolverla solo, sin avisar a nadie",
                  "Comentarla únicamente con el cliente",
                ]),
                tf("Una solicitud del cliente que contradice las consignas del puesto debe cumplirse sin consultar a nadie.", false),
                single("¿Qué significa actuar con integridad?", "Actuar con honestidad incluso cuando nadie lo supervisa", [
                  "Cumplir solo cuando el supervisor está presente",
                  "Hacer lo que más convenga al guardia",
                  "Evitar reportar los errores propios",
                ]),
              ],
            },
          },
          {
            title: "Presentación personal y recibo del puesto",
            lessons: [
              text(
                "Uniforme, aseo y puntualidad",
                "La imagen del guardia es la primera impresión que se lleva el cliente. Presente siempre el uniforme completo, limpio y en buen estado, el calzado lustrado, el cabello y la barba cuidados y la credencial a la vista.\n\nLlegue con anticipación (al menos 15 minutos antes del inicio del turno) para recibir el puesto sin apuros. La puntualidad también es seguridad: un puesto sin relevo a tiempo es un puesto desprotegido.",
              ),
              text(
                "Recibo y entrega del puesto",
                "El cambio de turno es un momento crítico. Antes de que se retire su compañero, verifique juntos:\n\n- Las novedades registradas en la bitácora del turno anterior.\n- El estado de los equipos: radio, linterna, detector, llaves y cámaras.\n- Las consignas vigentes del puesto y cualquier orden especial.\n- Los accesos, cerraduras y alarmas.\n\nFirme la bitácora solo cuando haya revisado todo. Al entregar su puesto, haga lo mismo con quien lo releva.",
              ),
              link("Afiliación al IESS: consulte sus derechos", "https://www.iess.gob.ec/"),
            ],
            quiz: {
              passing: 70,
              questions: [
                multi(
                  "Marque lo que debe verificar al recibir un puesto:",
                  ["Las novedades de la bitácora del turno anterior", "El estado de la radio y la linterna", "Las consignas vigentes del puesto"],
                  ["El menú de la cafetería del cliente", "El horario de salida de otro puesto"],
                ),
                single("¿Con cuánta anticipación conviene llegar a su turno?", "Al menos 15 minutos antes, para recibir el puesto", [
                  "Justo a la hora de inicio",
                  "Cuando termine de desayunar",
                  "Solo si es el primer día en el puesto",
                ]),
              ],
            },
          },
        ],
      },
      {
        title: "Conducta profesional",
        subs: [
          {
            title: "Código de conducta y confidencialidad",
            lessons: [
              text(
                "Trato con clientes y visitantes",
                "Salude con cortesía, identifíquese si se lo piden y mantenga siempre un tono calmado y respetuoso, incluso si la otra persona está molesta. Escuche, explique con claridad la norma que debe cumplir y ofrezca una alternativa cuando exista.\n\nNunca discuta, levante la voz ni responda a provocaciones. Si la situación se complica, mantenga la calma y llame a su supervisor.",
              ),
              text(
                "Confidencialidad de la información",
                "Lo que usted ve y escucha en su puesto es información reservada del cliente: horarios, rutas, ubicación de bienes, sistemas de seguridad, nombres de personas.\n\n- No comparta esta información con nadie ajeno al servicio, ni siquiera con conocidos o familiares.\n- No publique fotos ni videos de las instalaciones en redes sociales.\n- Si alguien le pregunta por detalles del servicio, no los dé y avise a su supervisor.\n\nRevelar información puede poner en riesgo a personas y causar la pérdida del contrato.",
              ),
              text(
                "Obsequios y favores",
                "No acepte dinero, regalos ni favores a cambio de permitir un ingreso, hacer una excepción o dejar de reportar algo. Aceptarlos compromete su honestidad y puede ser la puerta de entrada a un delito. Si le ofrecen algo, rechácelo con amabilidad y reporte el intento.",
              ),
            ],
            quiz: {
              passing: 70,
              questions: [
                single("Un conocido le pregunta por mensaje a qué hora sale el transporte de valores de su cliente. ¿Qué hace?", "No da la información y reporta el intento a su supervisor", [
                  "Se lo dice, porque es de confianza",
                  "Le da solo la hora aproximada",
                  "Lo ignora y no reporta nada",
                ]),
                tf("Puede publicar fotos del interior de las instalaciones del cliente si no se ve a ninguna persona.", false),
                multi(
                  "Son conductas inaceptables en el puesto:",
                  ["Aceptar dinero de un visitante por dejarlo pasar", "Abandonar el puesto sin autorización", "Compartir las rutas del cliente con un amigo"],
                  ["Reportar una novedad al supervisor", "Saludar con cortesía a los visitantes"],
                ),
              ],
            },
          },
        ],
      },
    ],
  },

  {
    title: "Prevención de riesgos y uso de extintores (Ejemplo)",
    description:
      "Cómo identificar los riesgos de un puesto de vigilancia, protegerse con el equipo adecuado y actuar ante un conato de incendio. Incluye un examen final con intentos limitados." + NOTE,
    progression: "SEQUENTIAL",
    published: true,
    recertMonths: 12,
    due: 15,
    modules: [
      {
        title: "Riesgos en el puesto de vigilancia",
        subs: [
          {
            title: "Identificar los riesgos",
            lessons: [
              text(
                "Tipos de riesgo en la vigilancia",
                "El trabajo de vigilancia expone a distintos riesgos:\n\n- Físicos: calor, frío, ruido, iluminación deficiente.\n- Ergonómicos: permanecer de pie o sentado por horas, levantar cargas, posturas forzadas.\n- Psicosociales: estrés, turnos nocturnos, trabajo en soledad.\n- De tránsito: control de vehículos y peatones en accesos.\n- Delincuenciales: robos, intrusiones, agresiones.\n- Biológicos: contacto con personas enfermas o con desechos.\n\nReconocerlos es el primer paso para prevenirlos.",
              ),
              text(
                "Peligro y riesgo: la diferencia",
                "El peligro es lo que puede causar un daño (un piso mojado, un cable pelado, una escalera sin pasamanos). El riesgo es la probabilidad de que ese daño ocurra y qué tan grave sería.\n\nEjemplo: un piso mojado sin señalizar en la entrada es un peligro. El riesgo es alto porque mucha gente pasa por ahí y una caída puede causar fracturas.\n\nPrimero se elimina el peligro; si no se puede, se señaliza y se reporta.",
              ),
              text(
                "Cómo reportar una condición insegura",
                "Una condición insegura es una situación del entorno que puede provocar un accidente. No espere a que alguien se lastime para reportarla.\n\n1. Proteja la zona si puede hacerlo sin riesgo (cinta, conos, aviso).\n2. Avise de inmediato a su supervisor.\n3. Registre en la bitácora qué encontró, dónde y a qué hora.\n4. Verifique en su siguiente ronda que haya sido corregida.",
              ),
            ],
            quiz: {
              passing: 70,
              questions: [
                single("Un piso mojado y sin señalizar en la entrada principal es:", "Un peligro que debe señalizarse y reportarse de inmediato", [
                  "Algo normal que se seca solo",
                  "Un problema que solo corresponde a limpieza",
                  "Un riesgo que se reporta únicamente si alguien se cae",
                ]),
                multi(
                  "Son riesgos ergonómicos:",
                  ["Permanecer de pie por períodos prolongados", "Levantar cargas sin la técnica adecuada"],
                  ["El ruido de la maquinaria", "El tránsito de vehículos en el acceso"],
                ),
                tf("Una condición insegura se reporta solo cuando ya causó un accidente.", false),
              ],
            },
          },
          {
            title: "Equipos de protección personal (EPP)",
            lessons: [
              text(
                "Qué es un EPP y cuándo usarlo",
                "El equipo de protección personal (EPP) es la última barrera entre usted y el riesgo. No elimina el peligro, pero reduce el daño si ocurre un accidente.\n\nEn la vigilancia se usan según el puesto: chaleco reflectivo en accesos vehiculares, calzado de seguridad en obras, guantes para manipular objetos sospechosos o cortantes, protección auditiva en zonas ruidosas y protección solar en exteriores.",
              ),
              text(
                "Cuidado y reposición del EPP",
                "Revise su equipo al inicio del turno: que no tenga roturas, que esté limpio y que se ajuste bien. Un EPP dañado no protege.\n\n- No preste su equipo a otras personas.\n- Guárdelo en un lugar limpio y seco.\n- Si se deteriora, avise a su supervisor para que lo reemplacen. Nunca trabaje con equipo roto.",
              ),
            ],
            quiz: {
              passing: 70,
              questions: [
                single("¿Qué debe hacer si su chaleco reflectivo está roto o muy desgastado?", "Avisar a su supervisor para que lo reemplacen", [
                  "Seguir usándolo hasta que se rompa del todo",
                  "Cambiarlo por el de un compañero sin avisar",
                  "No usarlo y trabajar sin chaleco",
                ]),
                tf("El EPP elimina por completo el peligro.", false),
              ],
            },
          },
        ],
      },
      {
        title: "Emergencias: incendios y extintores",
        subs: [
          {
            title: "El fuego y los tipos de extintor",
            lessons: [
              text(
                "El triángulo del fuego y las clases de fuego",
                "Para que haya fuego se necesitan tres elementos: combustible, oxígeno y calor. Si se elimina uno, el fuego se apaga.\n\nSegún lo que se quema, el fuego se clasifica en:\n\n- Clase A: sólidos comunes como madera, papel, cartón y tela.\n- Clase B: líquidos y gases inflamables, como gasolina, aceites y solventes.\n- Clase C: equipos eléctricos energizados.\n- Clase D: metales combustibles.\n- Clase K: aceites y grasas de cocina.",
              ),
              text(
                "Tipos de extintor y cuál usar",
                "Cada extintor sirve para ciertas clases de fuego:\n\n- Agua presurizada: clase A. Nunca en fuegos eléctricos ni de líquidos inflamables.\n- Polvo químico seco (PQS) ABC: clases A, B y C. Es el más común en oficinas y bodegas.\n- Dióxido de carbono (CO2): clases B y C. No deja residuos, ideal para equipos eléctricos.\n\nLea la etiqueta del extintor antes de una emergencia: ahí dice para qué clases de fuego sirve.",
              ),
            ],
            quiz: {
              passing: 70,
              questions: [
                single("Para un fuego en un tablero eléctrico energizado conviene usar:", "Un extintor de CO2 o de polvo químico seco (PQS)", [
                  "Un extintor de agua",
                  "Un balde de agua",
                  "Una manta mojada",
                ]),
                multi(
                  "Los tres elementos del triángulo del fuego son:",
                  ["Combustible", "Oxígeno", "Calor"],
                  ["Humo", "Agua"],
                ),
                tf("Un extintor de agua es adecuado para apagar un fuego de origen eléctrico.", false),
              ],
            },
          },
          {
            title: "Cómo usar un extintor",
            lessons: [
              video("Video: cómo usar un extintor con el método PASS", "https://www.youtube.com/watch?v=TxFhV-V5p50"),
              text(
                "El método PASS, paso a paso",
                "Use un extintor solo si el fuego es pequeño, tiene una salida despejada a su espalda y sabe cómo hacerlo. Si el fuego crece, evacúe y llame al 911.\n\nMétodo PASS:\n\n1. P — Halar el pasador de seguridad.\n2. A — Apuntar la boquilla hacia la base del fuego, no hacia las llamas.\n3. S — Apretar la palanca para liberar el agente extintor.\n4. S — Barrer de lado a lado, cubriendo la base del fuego.\n\nColóquese a una distancia prudente y avance solo si el fuego va cediendo.",
              ),
              link("ECU 911: servicio integrado de emergencias", "https://www.ecu911.gob.ec/"),
            ],
            quiz: {
              passing: 70,
              shuffleQuestions: false,
              shuffleOptions: false,
              questions: [
                single("¿Cuál es el primer paso del método PASS?", "Halar el pasador de seguridad", [
                  "Barrer de lado a lado",
                  "Apretar la palanca",
                  "Apuntar a las llamas más altas",
                ]),
                single("¿Hacia dónde se apunta la boquilla del extintor?", "A la base del fuego", [
                  "A las llamas más altas",
                  "Al humo",
                  "Al techo, para enfriar el ambiente",
                ]),
                tf("Antes de combatir un conato de incendio debe asegurarse de tener una salida despejada a su espalda.", true),
              ],
            },
          },
        ],
      },
      {
        title: "Evaluación final",
        subs: [
          {
            title: "Examen final del curso",
            lessons: [],
            quiz: {
              passing: 80,
              maxAttempts: 3,
              questions: [
                single("¿Qué es un peligro?", "La fuente que puede causar un daño", ["La probabilidad de que algo ocurra", "El equipo que protege al trabajador", "Un accidente que ya ocurrió"]),
                tf("El EPP reduce el daño de un accidente pero no elimina el peligro.", true),
                single("Un fuego de gasolina es de clase:", "B", ["A", "C", "D"]),
                multi("Puede usarse en fuegos de equipos eléctricos energizados:", ["Extintor de CO2", "Extintor de polvo químico seco (PQS)"], ["Extintor de agua", "Una manta mojada"]),
                single("Si el fuego crece y ya no puede controlarlo, usted debe:", "Evacuar y llamar al 911", ["Intentar apagarlo con lo que haya", "Esperar a que se apague solo", "Cerrar la puerta y seguir en el puesto"]),
                tf("La boquilla del extintor se apunta a las llamas más altas.", false),
                single("Ante una condición insegura usted debe:", "Protegerla si es posible, reportarla y registrarla", ["Ignorarla si nadie se ha lastimado", "Esperar el cambio de turno para comentarla", "Corregirla solo sin avisar"]),
                multi("Son clases de fuego:", ["Clase A", "Clase B", "Clase K"], ["Clase Z", "Clase X"]),
              ],
            },
          },
        ],
      },
    ],
  },

  {
    title: "Primeros auxilios básicos para personal de seguridad (Ejemplo)",
    description:
      "Qué hacer en los primeros minutos de una emergencia médica: proteger, avisar y socorrer, reanimación cardiopulmonar y control de hemorragias. El curso es libre: puede avanzar en el orden que prefiera. Certificado con vigencia de 24 meses." + NOTE,
    progression: "FREE",
    published: true,
    recertMonths: 24,
    modules: [
      {
        title: "Actuar ante una emergencia",
        subs: [
          {
            title: "Proteger, avisar, socorrer (PAS)",
            lessons: [
              text(
                "La conducta PAS",
                "Ante una emergencia, la conducta PAS ordena lo que hay que hacer:\n\nProteger: asegúrese de que el lugar es seguro para usted, para la víctima y para los demás. No se convierta en una víctima más. Retire o señalice el peligro (tránsito, cables, fuego) antes de acercarse.\n\nAvisar: llame al 911 y dé su ubicación exacta, qué ocurrió, cuántas personas están afectadas y en qué estado están. No cuelgue hasta que se lo indiquen.\n\nSocorrer: atienda a la víctima con lo que sabe, sin moverla si sospecha de lesión en el cuello o la columna, y sin darle comida ni bebida.",
              ),
              image("Práctica de primeros auxilios en grupo", "img"),
              link("ECU 911: servicio integrado de emergencias", "https://www.ecu911.gob.ec/"),
            ],
            quiz: {
              passing: 70,
              questions: [
                single("¿Qué significa la «P» de PAS?", "Proteger el lugar, a usted y a la víctima", ["Pedir ayuda a un familiar", "Preparar la camilla", "Pasar el reporte al supervisor"]),
                multi(
                  "Al llamar al 911 debe indicar:",
                  ["Su ubicación exacta", "Qué ocurrió", "Cuántas personas están afectadas"],
                  ["Su número de cédula", "El nombre del cliente"],
                ),
                tf("Si sospecha de una lesión en la columna, debe mover a la víctima cuanto antes.", false),
              ],
            },
          },
        ],
      },
      {
        title: "Reanimación cardiopulmonar (RCP)",
        subs: [
          {
            title: "RCP en adultos",
            lessons: [
              video("Video: RCP paso a paso (taller de Cruz Roja)", "https://www.youtube.com/watch?v=E-REMDllNSw"),
              video("Video: RCP en personas adultas, maniobra básica", "https://www.youtube.com/watch?v=qlfwsYRMjSg"),
              text(
                "Pasos de la RCP en un adulto",
                "Si una persona no responde y no respira con normalidad:\n\n1. Verifique que el lugar sea seguro.\n2. Llame al 911 (o pida a alguien que lo haga) y pida un desfibrilador (DEA) si hay uno cerca.\n3. Coloque a la persona boca arriba sobre una superficie firme.\n4. Ponga el talón de una mano en el centro del pecho, la otra mano encima, y comprima fuerte y rápido: unas 5 a 6 cm de profundidad, a un ritmo de 100 a 120 compresiones por minuto, dejando que el pecho vuelva a subir entre compresiones.\n5. Si está capacitado, alterne 30 compresiones con 2 ventilaciones. Si no lo está, haga solo compresiones continuas.\n6. No se detenga hasta que llegue la ayuda, la persona reaccione o llegue el DEA.",
              ),
              file("Guía de bolsillo: PAS y RCP (PDF)", "pdf"),
            ],
            quiz: {
              passing: 70,
              questions: [
                single("En un adulto, ¿cuántas compresiones se alternan con 2 ventilaciones?", "30", ["5", "15", "100"]),
                single("¿A qué ritmo se hacen las compresiones?", "De 100 a 120 por minuto", ["De 40 a 60 por minuto", "De 150 a 200 por minuto", "Al ritmo que resulte cómodo"]),
                multi(
                  "Antes de iniciar la RCP debe comprobar que:",
                  ["El lugar es seguro", "La persona no responde", "La persona no respira con normalidad"],
                  ["La persona tiene frío", "Hay testigos presentes"],
                ),
                tf("Si no está capacitado para dar ventilaciones, puede hacer solo compresiones continuas.", true),
              ],
            },
          },
        ],
      },
      {
        title: "Heridas y hemorragias",
        subs: [
          {
            title: "Control de hemorragias y heridas",
            lessons: [
              text(
                "Hemorragia externa: presión directa",
                "Para controlar una hemorragia externa:\n\n1. Protéjase con guantes si los tiene.\n2. Presione directamente sobre la herida con una gasa o tela limpia y no la retire aunque se empape: ponga otra encima.\n3. Si es en un brazo o pierna, mantenga la presión y eleve el miembro si no hay sospecha de fractura.\n4. Pida ayuda al 911.\n\nSi hay un objeto clavado, no lo retire: presione alrededor y fíjelo con vendas.",
              ),
              text(
                "Quemaduras y heridas menores",
                "Quemaduras leves: enfríe la zona con agua a temperatura ambiente durante 10 a 20 minutos; no aplique pasta dental, aceite ni hielo; cubra con un apósito limpio.\n\nHeridas menores: lave con agua limpia y jabón, cubra con gasa y vigile signos de infección (enrojecimiento, calor, pus).\n\nSi la quemadura o la herida es grande, profunda o está en cara, manos o genitales, busque atención médica.",
              ),
            ],
            quiz: {
              passing: 70,
              questions: [
                single("Si una gasa se empapa de sangre durante la presión directa, usted debe:", "Colocar otra encima sin retirar la primera", ["Retirarla y poner una nueva", "Quitar la presión para ver la herida", "Lavar la herida con alcohol"]),
                tf("Ante un objeto clavado en la herida, debe retirarlo de inmediato.", false),
                multi("En una quemadura leve se debe:", ["Enfriar con agua a temperatura ambiente", "Cubrir con un apósito limpio"], ["Aplicar pasta dental", "Aplicar hielo directamente"]),
              ],
            },
          },
          {
            title: "Persona inconsciente que respira",
            lessons: [
              text(
                "Posición lateral de seguridad",
                "Si la persona no responde pero respira con normalidad y no sospecha de lesión en la columna, colóquela de lado (posición lateral de seguridad). Así la lengua no obstruye la vía aérea y, si vomita, no se ahoga.\n\nVigile su respiración hasta que llegue la ayuda. Si deja de respirar con normalidad, inicie la RCP.",
              ),
            ],
          },
        ],
      },
    ],
  },

  {
    title: "Uso proporcional de la fuerza y derechos humanos (Ejemplo)",
    description:
      "Principios que rigen la actuación del personal de seguridad privada y cómo aplicarlos en situaciones reales. Nota mínima de 80 % y solo dos intentos por examen. El certificado no vence." + NOTE,
    progression: "SEQUENTIAL",
    published: true,
    recertMonths: null,
    due: 45,
    modules: [
      {
        title: "Principios de actuación",
        subs: [
          {
            title: "Legalidad, necesidad y proporcionalidad",
            lessons: [
              text(
                "Los tres principios",
                "Toda actuación del personal de seguridad debe cumplir tres principios:\n\n- Legalidad: solo se actúa dentro de lo que permiten la ley y las consignas del puesto. Un guardia no tiene las facultades de la Policía Nacional.\n- Necesidad: se recurre a la fuerza únicamente cuando no existe otra forma de evitar un daño.\n- Proporcionalidad: la respuesta debe ser acorde a la amenaza; nunca mayor.\n\nEn caso de duda, priorice la seguridad de las personas, evite el enfrentamiento y pida apoyo al 911 y a su supervisor.",
              ),
              text(
                "Escala de respuesta",
                "Ante un conflicto se sube de nivel solo si el anterior no funcionó y la situación lo exige:\n\n1. Presencia: su sola presencia uniformada previene muchos incidentes.\n2. Comunicación verbal: pida, explique, advierta con tono firme y respetuoso.\n3. Control sin fuerza: bloquear un paso, acompañar a una persona fuera del área.\n4. Contacto físico mínimo: solo si hay riesgo inmediato y de acuerdo con su capacitación y los protocolos.\n5. Última instancia: defensa propia o de terceros ante una amenaza grave e inminente.\n\nCada vez que use fuerza debe reportarlo de inmediato por escrito a su supervisor.",
              ),
            ],
            quiz: {
              passing: 80,
              maxAttempts: 2,
              questions: [
                single("¿Qué significa el principio de proporcionalidad?", "Que la respuesta debe ser acorde a la amenaza, nunca mayor", ["Que siempre se responde con la misma fuerza que usó el otro", "Que se usa la fuerza antes de dialogar", "Que solo se actúa si el cliente lo ordena"]),
                tf("Un guardia de seguridad privada tiene las mismas facultades que la Policía Nacional.", false),
                single("¿Cuál es el primer nivel de respuesta ante un conflicto?", "La presencia y la comunicación verbal", ["El contacto físico", "El uso de elementos de defensa", "Retener a la persona"]),
              ],
            },
          },
        ],
      },
      {
        title: "Derechos humanos en el servicio",
        subs: [
          {
            title: "Trato digno y límites de la actuación",
            lessons: [
              text(
                "Trato digno a toda persona",
                "Todas las personas, incluso quienes cometen una falta, tienen derecho a un trato digno. Esto significa:\n\n- No insultar, humillar ni amenazar.\n- No discriminar por apariencia, origen, género, condición social o discapacidad.\n- No realizar revisiones ni registros que no estén autorizados por las consignas y hechos con respeto a la intimidad.\n- No retener a una persona contra su voluntad fuera de lo que permita la ley.",
              ),
              text(
                "Qué hacer ante un hecho delictivo",
                "Si presencia un delito, su prioridad es la seguridad de las personas, incluida la suya. Mantenga la calma, no persiga ni se enfrente a quien huye, llame al 911 y reporte a su supervisor. Preserve el lugar y los objetos, y anote lo que observó.\n\nSi la ley y el protocolo del puesto permiten retener a una persona sorprendida en el acto, hágalo sin violencia innecesaria y entréguela de inmediato a la Policía Nacional.",
              ),
            ],
            quiz: {
              passing: 80,
              maxAttempts: 2,
              questions: [
                multi("Es un trato indebido hacia una persona:", ["Insultarla o humillarla", "Discriminarla por su apariencia"], ["Pedirle que se identifique con cortesía", "Explicarle la norma del lugar"]),
                single("Si presencia un robo y el ladrón huye, usted debe:", "Llamar al 911, reportar a su supervisor y no perseguirlo", ["Perseguirlo hasta atraparlo", "Dispararle si lleva algo robado", "Ignorar el hecho"]),
              ],
            },
          },
          {
            title: "Casos prácticos",
            lessons: [
              text(
                "Caso 1: visitante que se niega a identificarse",
                "Un visitante llega a un edificio de oficinas y se niega a registrarse y a mostrar su cédula, diciendo que «ya conoce a todos». Las consignas del puesto exigen registro para todos.\n\nPiense: ¿cuál es el primer paso? ¿Cuándo llamaría a su supervisor? ¿Qué NO haría?\n\nRespuesta esperada: explicar con calma la norma, ofrecer alternativas (que la persona a visitar baje a recibirlo), no permitir el ingreso sin registro y, si insiste, llamar al supervisor. Nunca discutir, empujar ni retener.",
              ),
              text(
                "Caso 2: persona agresiva en el acceso",
                "Una persona en evidente estado de ebriedad intenta ingresar a un conjunto residencial y empieza a gritar insultos. Otros residentes observan.\n\nPiense: ¿cómo mantiene la calma? ¿Qué nivel de respuesta corresponde?\n\nRespuesta esperada: mantener distancia prudente, hablar con tono firme y tranquilo, no responder a las provocaciones, bloquear el paso sin contacto físico, pedir apoyo al supervisor y, si hay riesgo, al 911. Registrar el hecho en la bitácora.",
              ),
            ],
            quiz: {
              passing: 80,
              maxAttempts: 2,
              questions: [
                single("Un visitante se niega a registrarse. Lo primero que hace es:", "Explicar con calma la norma y ofrecer alternativas", ["Dejarlo pasar para evitar problemas", "Empujarlo para impedir el paso", "Gritarle que debe cumplir"]),
                single("Ante una persona agresiva que insulta, usted:", "Mantiene la distancia y la calma, y pide apoyo", ["Le responde con el mismo tono", "Lo sujeta de inmediato por la fuerza", "Se va del puesto"]),
                tf("Cada vez que use la fuerza debe reportarlo de inmediato por escrito a su supervisor.", true),
              ],
            },
          },
        ],
      },
    ],
  },

  {
    title: "Atención al cliente y comunicación por radio (Ejemplo)",
    description:
      "Cómo atender al público con claridad y cortesía, y cómo comunicarse por radio de forma breve y precisa. Curso libre y sin exámenes: solo se completa revisando las lecciones." + NOTE,
    progression: "FREE",
    published: true,
    recertMonths: 12,
    modules: [
      {
        title: "Atención al público",
        subs: [
          {
            title: "El primer contacto",
            lessons: [
              text(
                "Saludar e informar",
                "El guardia es muchas veces la primera persona que ve un visitante. Salude siempre («Buenos días, bienvenido a…»), mire a los ojos, hable con claridad y pregunte con quién desea comunicarse.\n\nDé indicaciones precisas y completas (piso, oficina, ascensor) y, si no sabe algo, no improvise: consulte y vuelva con la respuesta.",
              ),
              text(
                "Cuando la persona está molesta",
                "Cuando alguien se muestra molesto:\n\n1. Escuche sin interrumpir.\n2. Muestre empatía: «Entiendo que es un inconveniente».\n3. Explique con calma la norma y la razón.\n4. Ofrezca una alternativa o derive al supervisor.\n\nNo se tome los insultos como algo personal y nunca discuta.",
              ),
            ],
          },
        ],
      },
      {
        title: "Comunicación por radio",
        subs: [
          {
            title: "Procedimiento radial",
            lessons: [
              text(
                "Mensajes breves y claros",
                "La radio es un canal compartido: sea breve y preciso.\n\n- Piense antes de hablar y presione el botón un segundo antes de empezar.\n- Identifique a quién llama y quién habla: «Central, de Puesto 2».\n- Espere la confirmación: «Adelante, Puesto 2».\n- Dé el mensaje completo y corto, y cierre con «Cambio».\n- Nunca transmita información confidencial ni use la radio para conversaciones personales.",
              ),
              text(
                "Alfabeto fonético",
                "Para deletrear placas, nombres o códigos sin confusión se usa el alfabeto fonético internacional: Alfa, Bravo, Charlie, Delta, Echo, Foxtrot, Golf, Hotel, India, Juliett, Kilo, Lima, Mike, November, Oscar, Papa, Quebec, Romeo, Sierra, Tango, Uniform, Victor, Whiskey, X-ray, Yankee, Zulu.\n\nEjemplo: la placa PBA-1234 se transmite «Papa, Bravo, Alfa, uno, dos, tres, cuatro».",
              ),
              link("Consulta: el alfabeto fonético completo", "https://es.wikipedia.org/wiki/Alfabeto_fon%C3%A9tico_de_la_OTAN"),
            ],
          },
        ],
      },
    ],
  },

  {
    title: "Control de accesos y rondas de vigilancia (Borrador de ejemplo)",
    description:
      "Curso en preparación, todavía sin publicar: sirve para ver cómo se ve un borrador, un examen sin preguntas y un módulo vacío." + NOTE,
    progression: "SEQUENTIAL",
    published: false,
    recertMonths: 12,
    modules: [
      {
        title: "Control de accesos",
        subs: [
          {
            title: "Registro de personas y vehículos",
            lessons: [text("Qué se registra y por qué", "Contenido en preparación.")],
          },
          {
            title: "Prácticas",
            lessons: [],
            quiz: { passing: 70, questions: [] },
          },
        ],
      },
      { title: "Rondas de vigilancia", subs: [] },
    ],
  },
];

// ───────────── Archivos de ejemplo ─────────────
async function buildPdf() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const navy = rgb(0.063, 0.059, 0.192);
  page.drawRectangle({ x: 0, y: 782, width: 595, height: 60, color: navy });
  page.drawText("Guía de bolsillo: PAS y RCP", { x: 40, y: 805, size: 20, font: bold, color: rgb(1, 1, 1) });
  const lines = [
    ["PAS: proteger, avisar, socorrer", true],
    ["1. Proteger: confirme que el lugar es seguro para usted y para la víctima.", false],
    ["2. Avisar: llame al 911. Indique ubicación, qué ocurrió y cuántas personas hay.", false],
    ["3. Socorrer: atienda sin mover a la víctima si sospecha lesión en cuello o columna.", false],
    ["", false],
    ["RCP en adultos", true],
    ["Persona que no responde y no respira con normalidad:", false],
    ["- Pida ayuda y un desfibrilador (DEA). Posición: boca arriba, superficie firme.", false],
    ["- Compresiones en el centro del pecho: 5 a 6 cm de profundidad.", false],
    ["- Ritmo: 100 a 120 compresiones por minuto, dejando que el pecho suba.", false],
    ["- Con capacitación: 30 compresiones y 2 ventilaciones. Sin ella: solo compresiones.", false],
    ["- No se detenga hasta que llegue la ayuda o la persona reaccione.", false],
    ["", false],
    ["Hemorragia externa", true],
    ["- Presión directa con gasa limpia; si se empapa, añada otra encima.", false],
    ["- No retire objetos clavados. Pida ayuda al 911.", false],
  ];
  let y = 740;
  for (const [t, h] of lines) {
    if (t) page.drawText(t, { x: 40, y, size: h ? 14 : 11, font: h ? bold : font, color: navy });
    y -= h ? 26 : 20;
  }
  page.drawText("Material de ejemplo — Capacitación Gemeseg", { x: 40, y: 40, size: 9, font, color: rgb(0.4, 0.4, 0.5) });
  return pdf.save();
}

const run = (cmd, a) => execFileSync(cmd, a, { stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" }).toString();
function upload(localPath, objectPath, contentType) {
  run("gcloud", ["storage", "cp", localPath, `gs://${BUCKET}/${objectPath}`, `--content-type=${contentType}`]);
}

async function main() {
  const db = new pg.Client({ connectionString });
  await db.connect();
  const q = (sql, params) => db.query(sql, params);

  const admin =
    (await q(`select id from "User" where email = 'sistemas@gemeseg.com'`)).rows[0] ??
    (await q(`select id from "User" where role = 'ADMIN' order by "createdAt" limit 1`)).rows[0];
  if (!admin) throw new Error("No hay ningún administrador; regístrese primero en la plataforma.");

  // Limpieza de una ejecución anterior (incluye los archivos del bucket).
  const old = (await q(`select id from "Course" where title like '% (Ejemplo)' or title like '% (Borrador de ejemplo)'`)).rows.map((r) => r.id);
  if (old.length) {
    const files = (
      await q(`select l."storagePath" p from "Lesson" l join "Submodule" s on s.id=l."submoduleId" join "Module" m on m.id=s."moduleId" where m."courseId" = any($1) and l."storagePath" is not null`, [old])
    ).rows;
    if (args.has("--archivos")) for (const f of files) try { run("gcloud", ["storage", "rm", `gs://${BUCKET}/${f.p}`]); } catch {}
    await q(`delete from "Course" where id = any($1)`, [old]);
    console.log(`Se reemplazaron ${old.length} curso(s) de ejemplo anteriores.`);
  }

  // Archivos de ejemplo
  const assets = {};
  if (args.has("--archivos")) {
    const tmp = path.join(here, ".tmp");
    mkdirSync(tmp, { recursive: true });
    const pdfPath = path.join(tmp, "guia-pas-rcp.pdf");
    writeFileSync(pdfPath, await buildPdf());
    const img = { path: `lessons/${randomUUID()}/practica-primeros-auxilios.jpg`, name: "practica-primeros-auxilios.jpg" };
    const pdf = { path: `lessons/${randomUUID()}/guia-pas-rcp.pdf`, name: "Guía de bolsillo PAS y RCP.pdf" };
    upload(path.join(here, "assets", "practica-primeros-auxilios.jpg"), img.path, "image/jpeg");
    upload(pdfPath, pdf.path, "application/pdf");
    assets.img = img;
    assets.pdf = pdf;
    console.log("Archivos de ejemplo subidos al bucket.");
  }

  const stats = { courses: 0, modules: 0, subs: 0, lessons: 0, quizzes: 0, questions: 0 };
  for (const c of courses) {
    const courseId = cuid();
    await q(
      `insert into "Course"(id,title,description,progression,published,"recertMonths","createdById","updatedAt") values($1,$2,$3,$4::"Progression",$5,$6,$7,now())`,
      [courseId, c.title, c.description, c.progression, c.published, c.recertMonths, admin.id],
    );
    stats.courses++;
    let mi = 0;
    for (const m of c.modules) {
      const moduleId = cuid();
      await q(`insert into "Module"(id,"courseId",title,"order") values($1,$2,$3,$4)`, [moduleId, courseId, m.title, mi++]);
      stats.modules++;
      let si = 0;
      for (const s of m.subs) {
        const subId = cuid();
        await q(`insert into "Submodule"(id,"moduleId",title,"order") values($1,$2,$3,$4)`, [subId, moduleId, s.title, si++]);
        stats.subs++;
        let li = 0;
        for (const l of s.lessons) {
          let type = l.type;
          let body = l.body ?? null;
          let url = l.url ?? null;
          let storagePath = null;
          let fileName = null;
          if (l.asset) {
            const a = assets[l.asset];
            if (!a) continue; // sin --archivos no se crean las lecciones con archivo
            type = l.type === "IMAGE" ? "IMAGE" : "FILE";
            storagePath = a.path;
            fileName = a.name;
          }
          await q(
            `insert into "Lesson"(id,"submoduleId",title,type,"order",body,url,"storagePath","fileName") values($1,$2,$3,$4::"LessonType",$5,$6,$7,$8,$9)`,
            [cuid(), subId, l.title, type, li++, body, url, storagePath, fileName],
          );
          stats.lessons++;
        }
        if (s.quiz) {
          const quizId = cuid();
          await q(
            `insert into "Quiz"(id,"submoduleId","passingScore","shuffleQuestions","shuffleOptions","maxAttempts") values($1,$2,$3,$4,$5,$6)`,
            [quizId, subId, s.quiz.passing, s.quiz.shuffleQuestions ?? true, s.quiz.shuffleOptions ?? true, s.quiz.maxAttempts ?? null],
          );
          stats.quizzes++;
          let qi = 0;
          for (const question of s.quiz.questions) {
            const qid = cuid();
            await q(`insert into "Question"(id,"quizId",type,text,"order") values($1,$2,$3::"QuestionType",$4,$5)`, [qid, quizId, question.type, question.text, qi++]);
            for (const o of question.options) {
              await q(`insert into "Option"(id,"questionId",text,"isCorrect") values($1,$2,$3,$4)`, [cuid(), qid, o.text, o.ok]);
            }
            stats.questions++;
          }
        }
      }
    }

    if (args.has("--inscribir") && c.published) {
      const users = (await q(`select id from "User" where active = true`)).rows;
      for (const u of users) {
        const due = c.due ? new Date(Date.now() + c.due * 86400000) : null;
        await q(
          `insert into "Enrollment"(id,"userId","courseId","assignedById","dueAt") values($1,$2,$3,$4,$5) on conflict ("userId","courseId") do nothing`,
          [cuid(), u.id, courseId, admin.id, due],
        );
      }
    }
  }

  for (const g of ["Sede Quito", "Sede Guayaquil", "Personal administrativo"]) {
    await q(`insert into "Group"(id,name) values($1,$2) on conflict (name) do nothing`, [cuid(), g]);
  }
  console.log("Listo:", stats);
  await db.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
