import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  END_OF_FORM, buildFormSubmission, formSubmissionKey, formatAnswer, nextQuestionIndex, richTextHtml, slugify, validateAnswer,
} from '../../src/modules/forms/formModel.ts';

test('conditional form navigation preserves old question IDs and handles retired targets', () => {
  const questions = [
    { id: 'q-start', kind: 'single_choice', logic: [
      { when: 'Encerrar', goTo: END_OF_FORM },
      { when: 'Pular', goTo: 'q-last' },
      { when: 'Antiga', goTo: 'q-deleted' },
    ] },
    { id: 'q-mid', kind: 'phone', logic: [{ when: 'Voltar', goTo: 'q-start' }] },
    { id: 'q-last', kind: 'short_text' },
  ];
  assert.equal(nextQuestionIndex(questions, 0, 'Encerrar'), -1);
  assert.equal(nextQuestionIndex(questions, 0, 'Pular'), 2);
  assert.equal(nextQuestionIndex(questions, 0, 'Antiga'), 1);
  assert.equal(nextQuestionIndex(questions, 1, 'Voltar'), 2);
  assert.equal(nextQuestionIndex(questions, 2, 'Resposta'), -1);
});

test('required answers accept a score of zero and reject empty input', () => {
  const question = { id: 'q-score', kind: 'scale', required: true };
  assert.equal(validateAnswer(question, 0), '');
  assert.ok(validateAnswer(question, undefined));
  assert.ok(validateAnswer({ ...question, kind: 'multi_choice' }, []));
  assert.ok(validateAnswer({ ...question, kind: 'email' }, 'sem-arroba'));
  assert.equal(validateAnswer({ ...question, kind: 'statement' }, undefined), '');
});

test('public form preserves the readable slug and export format for old answer data', () => {
  assert.equal(slugify(' Avaliação de Satisfação — CALI '), 'avaliacao-de-satisfacao-cali');
  assert.equal(formatAnswer({ kind: 'date' }, '2026-11-12'), '12/11/2026');
  assert.equal(formatAnswer({ kind: 'file' }, 'workspace/responses/1794528000000-retorno.pdf'), 'retorno.pdf');
  assert.equal(formatAnswer({ kind: 'scale' }, 0), '0');
});

test('form instructions render formatting and escape markup from submitted text', () => {
  const result = richTextHtml('**Política** [Ajuda](https://example.test/ajuda) <img src=x onerror=alert(1)>');
  assert.match(result, /<strong>Política<\/strong>/);
  assert.match(result, /<a href="https:\/\/example.test\/ajuda" target="_blank" rel="noopener noreferrer">Ajuda<\/a>/);
  assert.match(result, /&lt;img/);
  assert.doesNotMatch(result, /<img/);
  assert.doesNotMatch(richTextHtml('[clique](javascript:alert(1))'), /<a /);
});

test('public form submits only the answers and files on the chosen branch after going back', () => {
  const questions = [
    { id: 'branch', kind: 'multi_choice', logic: [{ when: 'Pular anexo', goTo: 'confirmation' }] },
    { id: 'old-upload', kind: 'file' },
    { id: 'confirmation', kind: 'statement' },
    { id: 'rating', kind: 'scale' },
  ];
  const answers = {
    branch: ['Aceito', 'Pular anexo'],
    'old-upload': 'form-id/responses/1794528000000-retorno.pdf',
    rating: 0,
  };
  const destination = nextQuestionIndex(questions, 0, answers.branch);
  assert.equal(destination, 2);
  assert.deepEqual(buildFormSubmission(questions, [0, destination, 3], answers), {
    branch: ['Aceito', 'Pular anexo'],
    rating: 0,
    __visited: ['branch', 'confirmation', 'rating'],
  });
});

test('retry identifies the same form and answers even if answer keys were inserted in another order', async () => {
  const formId = 'qa-form';
  const answers = { branch: 'Aceito', rating: 0, __visited: ['branch', 'rating'] };
  const key = await formSubmissionKey(formId, answers);
  assert.match(key, /^cali-form-submission:qa-form:[a-f0-9]{64}$/);
  assert.equal(await formSubmissionKey(formId, { rating: 0, __visited: answers.__visited, branch: 'Aceito' }), key);
  assert.notEqual(await formSubmissionKey(formId, { ...answers, rating: 1 }), key);
  assert.notEqual(await formSubmissionKey('outro-form', answers), key);
});
