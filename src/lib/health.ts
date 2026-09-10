export const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' },
  { value: 'nao_indico', label: 'Prefiro não indicar' },
];

export const GENDER_LABEL: Record<string, string> = {
  masculino: 'Masculino',
  feminino: 'Feminino',
  nao_indico: 'Prefiro não indicar',
};

export const MIN_HEIGHT_CM = 100;
export const MAX_HEIGHT_CM = 250;
export const MIN_BIRTH_YEAR = 1900;
export const CURRENT_YEAR = new Date().getFullYear();

export function isHeightValid(cm: number): boolean {
  return cm >= MIN_HEIGHT_CM && cm <= MAX_HEIGHT_CM;
}

export function normalizeHeightInput(t: string): string {
  const digits = t.replace(/[^0-9]/g, '').slice(0, 3);
  if (digits.length === 3) {
    const n = Number(digits);
    if (n > MAX_HEIGHT_CM) return digits.slice(0, 2);
  }
  return digits;
}

export function normalizeBirthYearInput(t: string): string {
  const digits = t.replace(/[^0-9]/g, '').slice(0, 4);
  if (digits.length === 4 && Number(digits) > CURRENT_YEAR) return digits.slice(0, 3);
  return digits;
}

export function calcBmi(kg: number, heightCm: number): number | null {
  if (!Number.isFinite(kg) || !Number.isFinite(heightCm) || kg <= 0 || heightCm <= 0)
    return null;
  const h = heightCm / 100;
  return kg / (h * h);
}

export function bmiCategory(bmi: number): { label: string; key: 'primary' | 'warn' | 'danger' } {
  if (bmi < 18.5) return { label: 'Baixo peso', key: 'warn' };
  if (bmi < 25) return { label: 'Peso normal', key: 'primary' };
  if (bmi < 30) return { label: 'Excesso de peso', key: 'warn' };
  return { label: 'Obesidade', key: 'danger' };
}

export function computeAge(
  year: number | null,
  month: number | null,
  day: number | null
): number | null {
  if (year == null) return null;
  const m = month ?? 1;
  const d = day ?? 1;
  const dob = new Date(year, m - 1, d);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - year;
  const beforeBirthday =
    today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d);
  if (beforeBirthday) age--;
  return age;
}

export function bmiCategoryAdjusted(
  bmi: number,
  age: number | null
): { label: string; key: 'primary' | 'warn' | 'danger'; note: string } {
  if (age != null && age < 18) {
    return {
      label: 'Sem categoria',
      key: 'warn',
      note: 'Para jovens, o IMC avalia-se com uma tabela de percentis por idade e género.',
    };
  }
  if (age != null && age >= 65) {
    // Em idosos, um IMC ligeiramente mais alto é protetor; a faixa saudável sobe.
    if (bmi < 22) return { label: 'Baixo peso', key: 'warn', note: 'Faixa saudável: 22–28' };
    if (bmi < 28) return { label: 'Peso normal', key: 'primary', note: 'Faixa saudável: 22–28' };
    if (bmi < 32) return { label: 'Excesso de peso', key: 'warn', note: 'Faixa saudável: 22–28' };
    return { label: 'Obesidade', key: 'danger', note: 'Faixa saudável: 22–28' };
  }
  if (bmi < 18.5) return { label: 'Baixo peso', key: 'warn', note: 'Faixa saudável: 18.5–24.9' };
  if (bmi < 25) return { label: 'Peso normal', key: 'primary', note: 'Faixa saudável: 18.5–24.9' };
  if (bmi < 30) return { label: 'Excesso de peso', key: 'warn', note: 'Faixa saudável: 18.5–24.9' };
  return { label: 'Obesidade', key: 'danger', note: 'Faixa saudável: 18.5–24.9' };
}

export function validateBirthInput(
  year: number | null,
  month: number | null,
  day: number | null
): string | null {
  if (year == null && month == null && day == null) return null;
  if (year != null && (year < MIN_BIRTH_YEAR || year > CURRENT_YEAR))
    return 'Ano de nascimento inválido.';
  if (month != null && (month < 1 || month > 12)) return 'Mês inválido.';
  if (day != null && (day < 1 || day > 31)) return 'Dia inválido.';
  const y = year ?? MIN_BIRTH_YEAR;
  const m = month ?? 1;
  const d = day ?? 1;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d)
    return 'Data de nascimento inválida.';
  if (dt.getTime() > Date.now()) return 'Não podes ter nascido no futuro 😉';
  return null;
}