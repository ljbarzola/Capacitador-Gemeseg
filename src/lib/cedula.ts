// Validación de cédula de identidad ecuatoriana (10 dígitos, algoritmo módulo 10).
//
// Estructura: 2 dígitos de provincia (01–24, o 30 para ecuatorianos nacidos en el
// exterior) + 1 dígito de tipo (0–5 para personas naturales) + 6 dígitos de secuencia
// + 1 dígito verificador.

export function normalizeCedula(input: string): string {
  return input.replace(/[\s-]/g, "");
}

export function isValidCedula(input: string): boolean {
  const cedula = normalizeCedula(input);
  if (!/^\d{10}$/.test(cedula)) return false;

  const province = Number(cedula.slice(0, 2));
  if (!((province >= 1 && province <= 24) || province === 30)) return false;

  if (Number(cedula[2]) > 5) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let value = Number(cedula[i]) * (i % 2 === 0 ? 2 : 1);
    if (value > 9) value -= 9;
    sum += value;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === Number(cedula[9]);
}
