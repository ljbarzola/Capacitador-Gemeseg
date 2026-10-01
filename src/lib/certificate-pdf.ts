import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import QRCode from "qrcode";

// Certificado en PDF (A4 horizontal), generado al descargarlo con los datos guardados al emitirlo.

const NAVY = rgb(0.063, 0.059, 0.192); // #100F31
const ORANGE = rgb(0.933, 0.231, 0.106); // #EE3B1B
const GREY = rgb(0.37, 0.37, 0.45);
const LIGHT = rgb(0.86, 0.87, 0.9);

const DATE = new Intl.DateTimeFormat("es-EC", { dateStyle: "long", timeZone: "America/Guayaquil" });

type CertificateData = {
  code: string;
  holderName: string;
  holderCedula: string;
  courseTitle: string;
  issuedAt: Date;
  expiresAt: Date | null;
};

// Reduce el tamaño hasta que el texto quepa en el ancho disponible.
function fit(text: string, font: PDFFont, max: number, width: number, min = 14) {
  let size = max;
  while (size > min && font.widthOfTextAtSize(text, size) > width) size -= 1;
  return size;
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderCertificatePdf(cert: CertificateData, verifyUrl: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Certificado ${cert.code}`);
  pdf.setAuthor("Gemeseg Seguridad");
  pdf.setSubject(`Certificado de aprobación: ${cert.courseTitle}`);

  const page = pdf.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);

  // Marco: banda azul marino a la izquierda y filete fino alrededor.
  page.drawRectangle({ x: 0, y: 0, width: 26, height, color: NAVY });
  page.drawRectangle({ x: 26, y: 0, width: 5, height, color: ORANGE });
  page.drawRectangle({ x: 52, y: 24, width: width - 76, height: height - 48, borderColor: LIGHT, borderWidth: 1 });

  const logo = await pdf.embedPng(await readFile(path.join(process.cwd(), "public", "brand", "logo-gemeseg-bgwhite.png")));
  const logoWidth = 150;
  const logoHeight = (logo.height / logo.width) * logoWidth;
  page.drawImage(logo, { x: 82, y: height - 52 - logoHeight, width: logoWidth, height: logoHeight });

  const mid = (width + 26) / 2;
  const area = width - 190;
  const draw = (text: string, font: PDFFont, size: number, y: number, color = NAVY) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: mid - w / 2, y, size, font, color });
  };

  draw("CERTIFICADO DE APROBACIÓN", bold, 26, height - 150);
  page.drawRectangle({ x: mid - 28, y: height - 166, width: 56, height: 3, color: ORANGE });

  draw("Gemeseg Seguridad certifica que", regular, 13, height - 205, GREY);

  const nameSize = fit(cert.holderName, serifBold, 38, area, 20);
  draw(cert.holderName, serifBold, nameSize, height - 252);
  draw(`con cédula de identidad N.° ${cert.holderCedula}`, regular, 12, height - 276, GREY);

  draw("ha completado y aprobado satisfactoriamente el curso", regular, 13, height - 314, GREY);

  const titleSize = fit(cert.courseTitle, bold, 24, area, 16);
  const titleLines = wrap(cert.courseTitle, bold, titleSize, area).slice(0, 3);
  titleLines.forEach((line, i) => draw(line, bold, titleSize, height - 350 - i * (titleSize + 6)));

  const baseY = 138;
  const issued = DATE.format(cert.issuedAt);
  const validity = cert.expiresAt ? `Válido hasta el ${DATE.format(cert.expiresAt)}` : "Sin fecha de vencimiento";
  draw(`Emitido el ${issued}`, regular, 12, baseY + 38, NAVY);
  draw(validity, regular, 12, baseY + 20, GREY);

  // Firma institucional y código de verificación.
  page.drawLine({ start: { x: 120, y: 96 }, end: { x: 330, y: 96 }, thickness: 0.8, color: NAVY });
  page.drawText("Capacitación Gemeseg", { x: 120, y: 80, size: 11, font: bold, color: NAVY });
  page.drawText("Gemeseg Seguridad", { x: 120, y: 66, size: 10, font: regular, color: GREY });

  const qr = await pdf.embedPng(await QRCode.toBuffer(verifyUrl, { margin: 1, width: 360, errorCorrectionLevel: "M" }));
  const qrSize = 84;
  const qrX = width - 92 - qrSize;
  page.drawImage(qr, { x: qrX, y: 52, width: qrSize, height: qrSize });
  // Bloque de verificación alineado a la derecha, junto al QR.
  const right = qrX - 14;
  const line = (text: string, font: PDFFont, size: number, y: number, color = NAVY) =>
    page.drawText(text, { x: right - font.widthOfTextAtSize(text, size), y, size, font, color });
  const host = verifyUrl.replace(/^https?:\/\//, "").replace(/\/verificar\/[^/]*$/, "/verificar");
  line("Verifique este certificado", bold, 10, 124);
  line("escaneando el código QR o ingresando en", regular, 9, 111, GREY);
  line(host, regular, 8.5, 99, GREY);
  line(`Código: ${cert.code}`, bold, 11, 78, ORANGE);

  return pdf.save();
}
