/**
 * VALIDADORES E FORMATADORES
 * Funções para validação e formatação de dados (CPF, telefone, etc)
 */

/**
 * Remove todos os caracteres não numéricos de uma string
 */
export function onlyNumbers(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Valida CPF brasileiro
 * @param cpf - CPF com ou sem formatação
 * @returns true se CPF é válido, false caso contrário
 */
export function isValidCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const cleanCPF = onlyNumbers(cpf);

  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) {
    return false;
  }

  // Verifica se todos os dígitos são iguais (CPF inválido)
  if (/^(\d)\1{10}$/.test(cleanCPF)) {
    return false;
  }

  // Calcula primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }

  let digit1 = 11 - (sum % 11);
  if (digit1 >= 10) {
    digit1 = 0;
  }

  // Verifica primeiro dígito
  if (digit1 !== parseInt(cleanCPF.charAt(9))) {
    return false;
  }

  // Calcula segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }

  let digit2 = 11 - (sum % 11);
  if (digit2 >= 10) {
    digit2 = 0;
  }

  // Verifica segundo dígito
  if (digit2 !== parseInt(cleanCPF.charAt(10))) {
    return false;
  }

  return true;
}

/**
 * Formata CPF no padrão XXX.XXX.XXX-XX
 * @param cpf - CPF com ou sem formatação
 * @returns CPF formatado ou string original se inválido
 */
export function formatCPF(cpf: string): string {
  const cleanCPF = onlyNumbers(cpf);

  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) {
    return cpf;
  }

  // Formata como XXX.XXX.XXX-XX
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata CPF enquanto o usuário digita
 * @param value - Valor atual do input
 * @returns Valor formatado
 */
export function formatCPFInput(value: string): string {
  const cleanCPF = onlyNumbers(value);

  // Limita a 11 dígitos
  const limitedCPF = cleanCPF.slice(0, 11);

  // Formata progressivamente
  if (limitedCPF.length <= 3) {
    return limitedCPF;
  } else if (limitedCPF.length <= 6) {
    return `${limitedCPF.slice(0, 3)}.${limitedCPF.slice(3)}`;
  } else if (limitedCPF.length <= 9) {
    return `${limitedCPF.slice(0, 3)}.${limitedCPF.slice(3, 6)}.${limitedCPF.slice(6)}`;
  } else {
    return `${limitedCPF.slice(0, 3)}.${limitedCPF.slice(3, 6)}.${limitedCPF.slice(6, 9)}-${limitedCPF.slice(9)}`;
  }
}

/**
 * Valida e-mail
 * @param email - E-mail a ser validado
 * @returns true se e-mail é válido, false caso contrário
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Formata telefone brasileiro
 * @param phone - Telefone com ou sem formatação
 * @returns Telefone formatado
 */
export function formatPhone(phone: string): string {
  const cleanPhone = onlyNumbers(phone);

  // Celular: (XX) XXXXX-XXXX
  if (cleanPhone.length === 11) {
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }

  // Fixo: (XX) XXXX-XXXX
  if (cleanPhone.length === 10) {
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }

  return phone;
}

/**
 * Formata telefone enquanto o usuário digita
 * @param value - Valor atual do input
 * @returns Valor formatado
 */
export function formatPhoneInput(value: string): string {
  const cleanPhone = onlyNumbers(value);

  // Limita a 11 dígitos
  const limitedPhone = cleanPhone.slice(0, 11);

  if (limitedPhone.length <= 2) {
    return limitedPhone;
  } else if (limitedPhone.length <= 6) {
    return `(${limitedPhone.slice(0, 2)}) ${limitedPhone.slice(2)}`;
  } else if (limitedPhone.length <= 10) {
    return `(${limitedPhone.slice(0, 2)}) ${limitedPhone.slice(2, 6)}-${limitedPhone.slice(6)}`;
  } else {
    return `(${limitedPhone.slice(0, 2)}) ${limitedPhone.slice(2, 7)}-${limitedPhone.slice(7)}`;
  }
}

/**
 * Valida CNPJ brasileiro
 * @param cnpj - CNPJ com ou sem formatação
 * @returns true se CNPJ é válido, false caso contrário
 */
export function isValidCNPJ(cnpj: string): boolean {
  const cleanCNPJ = onlyNumbers(cnpj);

  if (cleanCNPJ.length !== 14) {
    return false;
  }

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) {
    return false;
  }

  // Validação do primeiro dígito verificador
  let sum = 0;
  let weight = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  let digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

  if (digit1 !== parseInt(cleanCNPJ.charAt(12))) {
    return false;
  }

  // Validação do segundo dígito verificador
  sum = 0;
  weight = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  let digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

  if (digit2 !== parseInt(cleanCNPJ.charAt(13))) {
    return false;
  }

  return true;
}

/**
 * Formata CNPJ no padrão XX.XXX.XXX/XXXX-XX
 * @param cnpj - CNPJ com ou sem formatação
 * @returns CNPJ formatado ou string original se inválido
 */
export function formatCNPJ(cnpj: string): string {
  const cleanCNPJ = onlyNumbers(cnpj);

  if (cleanCNPJ.length !== 14) {
    return cnpj;
  }

  return cleanCNPJ.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}
