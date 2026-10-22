/* CALI Forms: modelo comum à tela da administradora e à página pública (/f/:slug). As perguntas ficam numa lista
   JSON no próprio formulário (cali_workspace.forms.questions); as respostas, por id de pergunta, em form_responses. */

export type QuestionKind = 'name' | 'email' | 'phone' | 'short_text' | 'long_text' | 'single_choice' | 'multi_choice' | 'scale' | 'yes_no' | 'date' | 'number' | 'file' | 'statement';

export type FormQuestion = {
  id: string;
  kind: QuestionKind;
  label: string;
  help?: string;
  required?: boolean;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  minLabel?: string;
  maxLabel?: string;
  /** Pergunta condicional: se a resposta for `when`, segue para a pergunta `goTo` (id) ou END_OF_FORM. */
  logic?: Array<{ when: string; goTo: string }>;
};

export const END_OF_FORM = '__end';

export type FormStatus = 'draft' | 'open' | 'closed';
export type FormAudience = 'cali' | 'client';

export const AUDIENCE_LABELS: Record<FormAudience, string> = { cali: 'Uso da CALI', client: 'Clientes' };

export const CATEGORY_SUGGESTIONS = ['Questionário', 'Pesquisa de satisfação', 'Pesquisa de clima', 'NPS', 'Diagnóstico', 'Avaliação', 'Inscrição', 'Levantamento', 'Cadastro', 'Feedback'];

export type FormRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  thank_you: string;
  status: FormStatus;
  company_id: string | null;
  questions: FormQuestion[];
  confirm_email: boolean;
  /** Aparece para quem responde, acima do título (ex.: Pesquisa de satisfação). */
  category: string;
  /** Organização interna: formulário da própria CALI ou feito para um cliente. */
  audience: FormAudience;
  created_at: string;
  updated_at: string;
};

export type FormAnswer = string | number | string[];

export const KIND_LABELS: Record<QuestionKind, string> = {
  name: 'Nome',
  email: 'E-mail',
  phone: 'Telefone / WhatsApp',
  short_text: 'Resposta curta',
  long_text: 'Resposta longa',
  single_choice: 'Escolha única',
  multi_choice: 'Múltipla escolha',
  scale: 'Escala de nota',
  yes_no: 'Sim ou não',
  date: 'Data',
  number: 'Número',
  file: 'Arquivo ou foto',
  statement: 'Texto informativo (sem resposta)',
};

export const KIND_ORDER: QuestionKind[] = ['name', 'email', 'phone', 'short_text', 'long_text', 'single_choice', 'multi_choice', 'scale', 'yes_no', 'date', 'number', 'file', 'statement'];

export const STATUS_LABELS: Record<FormStatus, string> = { draft: 'Rascunho', open: 'Recebendo respostas', closed: 'Encerrado' };

export const PUBLIC_FORM_BASE = 'https://app.calirh.com/f/';

export function questionId() {
  return `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function newQuestion(kind: QuestionKind): FormQuestion {
  const base: FormQuestion = { id: questionId(), kind, label: '', required: kind !== 'statement' };
  if (kind === 'name') return { ...base, label: 'Qual é o seu nome?' };
  if (kind === 'email') return { ...base, label: 'Qual é o seu e-mail?', help: 'Enviaremos a confirmação para este endereço.' };
  if (kind === 'phone') return { ...base, label: 'Qual é o seu telefone ou WhatsApp?' };
  if (kind === 'single_choice' || kind === 'multi_choice') return { ...base, options: ['Opção 1', 'Opção 2'] };
  if (kind === 'scale') return { ...base, scaleMin: 0, scaleMax: 10, minLabel: 'Nada provável', maxLabel: 'Muito provável' };
  return base;
}

export function slugify(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/g, '');
}

export function isAnswerable(question: FormQuestion) {
  return question.kind !== 'statement';
}

export function isEmpty(value: FormAnswer | undefined) {
  return value === undefined || value === null || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && !value.length);
}

export function scaleRange(question: FormQuestion) {
  const min = Number.isFinite(question.scaleMin) ? Number(question.scaleMin) : 0;
  const max = Number.isFinite(question.scaleMax) ? Number(question.scaleMax) : 10;
  const lo = Math.max(0, Math.min(min, 10));
  const hi = Math.max(lo + 1, Math.min(max, 10));
  return Array.from({ length: hi - lo + 1 }, (_, index) => lo + index);
}

/** Valida uma resposta antes de avançar; devolve a mensagem de erro ou vazio. */
export function validateAnswer(question: FormQuestion, value: FormAnswer | undefined) {
  if (!isAnswerable(question)) return '';
  if (isEmpty(value)) return question.required ? 'Esta pergunta é obrigatória.' : '';
  if (question.kind === 'email' && typeof value === 'string' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim())) return 'Confira o e-mail digitado.';
  if (question.kind === 'phone' && typeof value === 'string' && value.replace(/\D/g, '').length < 8) return 'Confira o número digitado.';
  return '';
}

export function fileLabel(value: string) {
  if (/^https?:\/\//.test(value)) return 'Arquivo enviado (link)';
  const last = value.split('/').pop() || value;
  return last.replace(/^\d{10,}-/, '');
}

export function formatAnswer(question: FormQuestion, value: unknown) {
  if (value === undefined || value === null || value === '') return '';
  if (question.kind === 'file' && typeof value === 'string') return fileLabel(value);
  if (Array.isArray(value)) return value.join(', ');
  if (question.kind === 'date' && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split('-').reverse().join('/');
  return String(value);
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

/** Texto com marcação simples: **negrito**, *itálico*, __sublinhado__. Escapa o HTML antes de aplicar. */
export function richTextHtml(value: string) {
  return escapeHtml(value)
    .replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_\n]+?)__/g, '<u>$1</u>')
    .replace(/(^|[^*])\*([^*\n]+?)\*/g, '$1<em>$2</em>');
}

export function stripRichText(value: string) {
  return value.replace(/\*\*([^*\n]+?)\*\*/g, '$1').replace(/__([^_\n]+?)__/g, '$1').replace(/(^|[^*])\*([^*\n]+?)\*/g, '$1$2');
}

/** Próxima pergunta, respeitando a lógica condicional da atual. Devolve -1 para encerrar. */
export function nextQuestionIndex(questions: FormQuestion[], index: number, answer: FormAnswer | undefined) {
  const current = questions[index];
  const rule = current?.logic?.find((item) => item.goTo && (Array.isArray(answer) ? answer.includes(item.when) : String(answer ?? '') === item.when));
  if (rule) {
    if (rule.goTo === END_OF_FORM) return -1;
    const target = questions.findIndex((question) => question.id === rule.goTo);
    if (target > index) return target;
  }
  return index + 1 < questions.length ? index + 1 : -1;
}

export function choiceOptions(question: FormQuestion) {
  return question.kind === 'yes_no' ? ['Sim', 'Não'] : question.kind === 'single_choice' ? (question.options || []).filter((option) => option.trim()) : [];
}
