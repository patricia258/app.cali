/* Perfil Comportamental CALI — textos dos relatórios (RASCUNHO v1 para revisão da proprietária).
   Um único texto por perfil, usado no relatório do respondente (2ª pessoa, acolhedor) e no do avaliador
   (descritivo, orientado a decisão). Temperamento entra só como vocabulário, nunca como nota. */
import type { Style } from './profileMethod';

export type StyleContent = {
  name: string;
  oneLiner: string;
  firstMove: string;
  color: string;
  soft: string;
  temperament: string;
  temperamentWords: string;
  respondent: {
    summary: string;
    strengths: Array<{ title: string; example: string }>;
    attention: { name: string; text: string };
    decides: string; communicates: string; reacts: string;
    energy: string[]; drains: string[];
    thrives: { ambiente: string; lideranca: string; rotina: string; reconhecimento: string };
    tips: string[];
  };
  evaluator: {
    synthesis: string;
    roleFavors: string[]; roleNeedsSupport: string[];
    lead: { comunicacao: string; delegacao: string; feedback: string; reconhecimento: string; evitar: string };
    risks: Array<{ risk: string; signal: string }>;
    interview: string[];
  };
  bandHigh: string; bandLow: string;
  pressureUp: string; pressureDown: string;
};

export const STYLE_CONTENT: Record<Style, StyleContent> = {
  D: {
    name: 'Executor', oneLiner: 'Resolve. Decide com pouca informação e gosta de desafio.', firstMove: 'Agir, mesmo sem plano completo.',
    color: '#7A1F3D', soft: '#F3E3E8', temperament: 'Colérico', temperamentWords: 'direto, intenso, competitivo, impaciente com demora',
    respondent: {
      summary: 'No dia a dia, você tende a ir direto ao ponto e a puxar a decisão para si quando as coisas param. Gosta de ver resultado acontecendo e se sente bem quando tem autonomia para resolver do seu jeito.',
      strengths: [
        { title: 'Decisão', example: 'Quando a reunião termina sem definição, é você quem propõe o próximo passo.' },
        { title: 'Iniciativa', example: 'Você começa antes de ter todas as respostas e ajusta no caminho.' },
        { title: 'Foco em resultado', example: 'Em semana cheia, você sabe o que precisa sair primeiro.' },
        { title: 'Coragem com o difícil', example: 'Você não foge de conversa complicada nem de meta alta.' },
      ],
      attention: { name: 'Pressa que atropela', text: 'Quando a velocidade vira prioridade, outras pessoas podem ficar para trás ou não se sentir ouvidas. Vale combinar quem precisa participar antes de decidir.' },
      decides: 'Você decide rápido e prefere corrigir depois a esperar demais. Informação suficiente, para você, costuma ser menos do que para os outros.',
      communicates: 'Você comunica de forma objetiva, sem rodeio. Ganha tempo, mas às vezes soa mais duro do que pretende.',
      reacts: 'Sob pressão, você acelera e assume o controle. O risco é centralizar e deixar pouco espaço para o time.',
      energy: ['Metas claras e desafiadoras', 'Autonomia para decidir', 'Ver resultado rápido', 'Resolver problemas que travam os outros'],
      drains: ['Processo lento e muita aprovação', 'Reunião sem decisão', 'Falta de clareza sobre quem decide', 'Tarefa repetitiva sem propósito'],
      thrives: { ambiente: 'Ritmo rápido, metas visíveis e espaço para agir.', lideranca: 'Quem combina o objetivo e confia no caminho que você escolher.', rotina: 'Variada, com problemas novos para resolver.', reconhecimento: 'Por resultado entregue e por desafios maiores.' },
      tips: ['Antes de decidir algo que afeta outras pessoas, pergunte a uma delas o que ela vê.', 'Em conversas difíceis, comece pelo objetivo comum e só depois vá ao ponto.', 'Escolha uma tarefa por semana para delegar por inteiro, sem retomar no meio.'],
    },
    evaluator: {
      synthesis: 'Perfil de execução e decisão. Rende em contextos de autonomia, meta e mudança; exige atenção à escuta e ao ritmo do time.',
      roleFavors: ['Funções com meta, prazo e autonomia', 'Gestão de crise, abertura de frente e retomada', 'Negociação e decisão sob incerteza'],
      roleNeedsSupport: ['Funções de alto detalhe e conferência', 'Ambientes muito regulados ou lentos', 'Papéis de suporte contínuo sem decisão própria'],
      lead: {
        comunicacao: 'Seja direto e breve: objetivo, prazo e o que está em jogo. Evite rodeios e excesso de contexto.',
        delegacao: 'Delegue o resultado, não o passo a passo. Combine limites claros (o que não pode) e deixe o caminho com a pessoa.',
        feedback: 'Objetivo e frequente, com fatos. Diga o impacto no resultado; elogio genérico tem pouco efeito.',
        reconhecimento: 'Responsabilidade maior, desafio novo e visibilidade do resultado entregue.',
        evitar: 'Microgestão, decisões travadas sem explicação e reuniões longas sem conclusão.',
      },
      risks: [
        { risk: 'Centralizar decisões e esvaziar o time', signal: 'O time passa a esperar a pessoa para tudo.' },
        { risk: 'Atrito por tom duro', signal: 'Colegas evitam discordar dela em público.' },
        { risk: 'Pular etapas de qualidade', signal: 'Retrabalho em entregas feitas com pressa.' },
      ],
      interview: [
        'Conte uma decisão importante que você tomou com pouca informação. O que pesou e o que você faria diferente?',
        'Como você age quando discorda da forma como seu gestor quer fazer algo?',
        'Fale de uma vez em que sua velocidade gerou um problema para outra pessoa.',
        'Como você decide o que delegar e como acompanha o que delegou?',
        'Que tipo de processo você considera desnecessário? E qual você respeita mesmo achando lento?',
      ],
    },
    bandHigh: 'Busca controle do resultado e decide rápido; tende a impaciência com demora e consulta.', bandLow: 'Prefere decidir com consenso ou com mais informação; menos inclinação a disputar a liderança da situação.',
    pressureUp: 'Sob pressão, assume o comando e acelera: tende a decidir sozinho e a cobrar mais duro.', pressureDown: 'Sob pressão, recua da decisão: espera orientação ou mais informação antes de agir.',
  },
  I: {
    name: 'Comunicador', oneLiner: 'Conecta. Convence pela energia e pela relação.', firstMove: 'Falar com as pessoas.',
    color: '#B58C52', soft: '#F6ECDD', temperament: 'Sanguíneo', temperamentWords: 'entusiasmado, espontâneo, comunicativo, disperso sob rotina',
    respondent: {
      summary: 'No dia a dia, você aproxima pessoas e coloca energia no ambiente. Gosta de conversar, trocar ideias e trabalhar com gente, e costuma convencer mais pela relação do que pelo argumento técnico.',
      strengths: [
        { title: 'Relacionamento', example: 'Você cria confiança rápido com quem acabou de conhecer.' },
        { title: 'Comunicação', example: 'Você explica uma ideia de um jeito que as pessoas entendem e topam.' },
        { title: 'Energia para o time', example: 'Em semana pesada, é você quem levanta o clima.' },
        { title: 'Abertura ao novo', example: 'Você é dos primeiros a experimentar uma forma nova de fazer.' },
      ],
      attention: { name: 'Começar mais do que terminar', text: 'O entusiasmo com o novo pode deixar tarefas de fechamento e detalhes para depois. Vale reservar tempo fixo para concluir o que já começou.' },
      decides: 'Você decide considerando as pessoas envolvidas e o clima. Às vezes decide pelo entusiasmo do momento e revê depois.',
      communicates: 'Você comunica com facilidade e calor. Fala bem em grupo e tende a preencher silêncios.',
      reacts: 'Sob pressão, você busca apoio e conversa. O risco é dispersar ou evitar a conversa difícil para manter o clima bom.',
      energy: ['Trabalhar com gente', 'Ideias e projetos novos', 'Reconhecimento e retorno', 'Ambiente leve e colaborativo'],
      drains: ['Trabalho solitário por muito tempo', 'Rotina repetitiva', 'Clima frio ou de cobrança constante', 'Excesso de controle e relatório'],
      thrives: { ambiente: 'Colaborativo, com troca e espaço para ideias.', lideranca: 'Quem dá retorno frequente e reconhece o esforço.', rotina: 'Com contato com pessoas e alguma variedade.', reconhecimento: 'Público, na frente do time.' },
      tips: ['Termine o dia anotando as três tarefas que precisam ser fechadas amanhã.', 'Antes de prometer um prazo, confira o que já está na sua lista.', 'Quando a conversa for difícil, trate o assunto no dia, mesmo que o clima fique tenso por um momento.'],
    },
    evaluator: {
      synthesis: 'Perfil de influência e relacionamento. Rende em contato com pessoas, mobilização e mudança; exige estrutura para fechamento e detalhe.',
      roleFavors: ['Relacionamento com cliente, vendas e parcerias', 'Comunicação interna, treinamento e integração', 'Projetos que dependem de engajar pessoas'],
      roleNeedsSupport: ['Funções analíticas e solitárias', 'Rotinas de controle, conferência e conciliação', 'Papéis com pouco contato humano'],
      lead: {
        comunicacao: 'Converse, não só mande mensagem. Dê contexto e mostre o impacto nas pessoas.',
        delegacao: 'Delegue com combinado de prazo e pontos de checagem; ajude a quebrar em etapas.',
        feedback: 'Comece pelo que funcionou, seja específico no ajuste e combine a próxima conversa.',
        reconhecimento: 'Público, visível e frequente; oportunidades de representar o time.',
        evitar: 'Isolamento, críticas em público e ambientes de controle excessivo.',
      },
      risks: [
        { risk: 'Compromissos acima da capacidade', signal: 'Prazos aceitos com entusiasmo que começam a escorregar.' },
        { risk: 'Detalhe e registro negligenciados', signal: 'Informação importante que fica só na conversa.' },
        { risk: 'Evitar conflito necessário', signal: 'Problemas conhecidos que não chegam ao gestor.' },
      ],
      interview: [
        'Conte um projeto que você começou com entusiasmo. Como garantiu que ele fosse concluído?',
        'Como você organiza tarefas de rotina que não envolvem pessoas?',
        'Fale de uma conversa difícil que você precisou ter. Como se preparou?',
        'Como você lida quando o seu trabalho não é visto ou reconhecido?',
        'Dê um exemplo de compromisso que você aceitou e não conseguiu cumprir. O que aprendeu?',
      ],
    },
    bandHigh: 'Busca contato, influência e reconhecimento; tende a dispersar em rotina e detalhe.', bandLow: 'Mais reservado e seletivo nas relações; prefere convencer por fato a convencer por entusiasmo.',
    pressureUp: 'Sob pressão, fala mais e busca apoio: tende a mobilizar pessoas, mas também a dispersar.', pressureDown: 'Sob pressão, se recolhe: fica mais quieto e menos disponível para o time.',
  },
  S: {
    name: 'Planejador', oneLiner: 'Sustenta. Mantém o time de pé e cumpre o combinado.', firstMove: 'Cuidar da estabilidade do grupo.',
    color: '#5E7F68', soft: '#E4EDE6', temperament: 'Fleumático', temperamentWords: 'calmo, constante, conciliador, evita atrito',
    respondent: {
      summary: 'No dia a dia, você é a pessoa com quem o time pode contar. Cumpre o que combina, mantém a calma e prefere um ritmo constante e previsível, em que todos sabem o que esperar.',
      strengths: [
        { title: 'Confiabilidade', example: 'O que você combinou acontece, mesmo sem ninguém cobrar.' },
        { title: 'Escuta', example: 'Colegas procuram você para conversar quando algo não vai bem.' },
        { title: 'Calma no aperto', example: 'Em dia caótico, você mantém o ritmo e acalma quem está ao lado.' },
        { title: 'Constância', example: 'Rotinas longas e repetitivas continuam bem feitas com você.' },
      ],
      attention: { name: 'Guardar para não incomodar', text: 'Para evitar atrito, você pode deixar de dizer o que pensa ou aceitar mais do que dá conta. Vale treinar o "não" e falar cedo quando algo incomoda.' },
      decides: 'Você decide com calma e considerando o impacto nas pessoas. Prefere ter tempo e segurança antes de mudar o que funciona.',
      communicates: 'Você comunica de forma tranquila e cuidadosa. Escuta mais do que fala e evita confronto direto.',
      reacts: 'Sob pressão, você segura o ritmo e protege o grupo. O risco é absorver demais e não pedir ajuda.',
      energy: ['Ambiente estável e cordial', 'Saber o que esperar', 'Ajudar e ser útil ao time', 'Relações de longo prazo'],
      drains: ['Mudança de última hora', 'Clima de conflito', 'Cobrança agressiva', 'Prioridades que mudam todo dia'],
      thrives: { ambiente: 'Cordial, previsível e com combinados claros.', lideranca: 'Quem avisa antes das mudanças e explica o porquê.', rotina: 'Constante, com tempo para fazer bem feito.', reconhecimento: 'Reservado, em conversa individual.' },
      tips: ['Quando algo incomodar, fale na mesma semana, em conversa a dois.', 'Antes de aceitar um pedido novo, diga o que precisa sair da sua lista para ele caber.', 'Diante de uma mudança, pergunte o motivo e o prazo: isso ajuda a se adaptar mais rápido.'],
    },
    evaluator: {
      synthesis: 'Perfil de constância e cooperação. Rende em rotinas, atendimento contínuo e times que precisam de coesão; exige apoio em mudança e posicionamento.',
      roleFavors: ['Rotinas operacionais e administrativas contínuas', 'Atendimento e suporte de longo prazo', 'Funções que sustentam o time e a qualidade do clima'],
      roleNeedsSupport: ['Ambientes de mudança constante', 'Funções de negociação dura ou cobrança', 'Papéis que exigem decisão rápida e solitária'],
      lead: {
        comunicacao: 'Calma e antecipada. Explique o porquê e o impacto nas pessoas; dê tempo para a pessoa processar.',
        delegacao: 'Delegue com instrução clara, exemplo e disponibilidade para dúvidas; combine o padrão esperado.',
        feedback: 'Em particular, com cuidado e constância. Pergunte como a pessoa está antes de entrar no ajuste.',
        reconhecimento: 'Individual e sincero; segurança, pertencimento e reconhecimento da contribuição para o time.',
        evitar: 'Mudanças sem aviso, exposição em público e clima de conflito.',
      },
      risks: [
        { risk: 'Sobrecarga silenciosa', signal: 'Aceita tudo e só demonstra cansaço quando já está esgotado.' },
        { risk: 'Resistência passiva à mudança', signal: 'Concorda na reunião e mantém o jeito antigo na prática.' },
        { risk: 'Problemas que não sobem', signal: 'Conflitos no time chegam ao gestor tarde demais.' },
      ],
      interview: [
        'Conte uma mudança grande no seu trabalho. Como você se adaptou e quanto tempo levou?',
        'Como você age quando discorda de uma decisão do time?',
        'Fale de uma vez em que você disse "não" a um pedido. Como foi?',
        'Como você percebe que está sobrecarregado e o que faz com isso?',
        'Que tipo de rotina faz você render melhor? E qual tira sua energia?',
      ],
    },
    bandHigh: 'Busca estabilidade, previsibilidade e harmonia; tende a evitar conflito e mudança brusca.', bandLow: 'Mais confortável com mudança e variedade; menor paciência com rotina e ritmo lento.',
    pressureUp: 'Sob pressão, se apega ao combinado: busca rotina, evita conflito e pode resistir a mudanças.', pressureDown: 'Sob pressão, perde a constância: fica mais reativo e menos paciente com o ritmo do grupo.',
  },
  C: {
    name: 'Analista', oneLiner: 'Confere. Quer critério, dado e padrão antes de concordar.', firstMove: 'Entender antes de responder.',
    color: '#3F5F7F', soft: '#E3EAF1', temperament: 'Melancólico', temperamentWords: 'criterioso, profundo, reservado, exigente consigo',
    respondent: {
      summary: 'No dia a dia, você quer entender o porquê das coisas e fazer certo. Confere, organiza e segue critério, e se sente melhor quando há padrão claro e tempo para pensar.',
      strengths: [
        { title: 'Precisão', example: 'Você encontra o erro que passou por todo mundo.' },
        { title: 'Organização', example: 'Antes de começar, você já sabe a ordem das etapas.' },
        { title: 'Análise', example: 'Você pede o dado antes de concordar e isso evita decisões ruins.' },
        { title: 'Padrão de qualidade', example: 'O que sai da sua mão chega pronto, sem retrabalho.' },
      ],
      attention: { name: 'Perfeição que atrasa', text: 'A busca pelo certo pode atrasar entregas e deixar você exigente demais consigo e com os outros. Vale combinar antes o que é "bom o suficiente" para cada tarefa.' },
      decides: 'Você decide com base em dado e critério. Prefere esperar a ter segurança do que decidir no escuro.',
      communicates: 'Você comunica de forma precisa e estruturada. Pode parecer reservado ou crítico quando questiona.',
      reacts: 'Sob pressão, você se fecha e confere ainda mais. O risco é travar a decisão ou se cobrar além da conta.',
      energy: ['Critério e regra claros', 'Tempo para pensar e fazer bem feito', 'Trabalho concentrado', 'Informação completa e organizada'],
      drains: ['Resposta vaga e mudança sem explicação', 'Pressa que compromete a qualidade', 'Improviso constante', 'Interrupções frequentes'],
      thrives: { ambiente: 'Organizado, com padrão e espaço para concentração.', lideranca: 'Quem explica o critério e dá tempo para análise.', rotina: 'Estruturada, com etapas claras.', reconhecimento: 'Pela qualidade e pela competência técnica.' },
      tips: ['No início de cada tarefa, escreva o que é "pronto" para ela e pare quando chegar lá.', 'Quando faltar informação, defina um prazo para decidir mesmo assim.', 'Ao questionar algo, traga junto uma alternativa: isso transforma crítica em contribuição.'],
    },
    evaluator: {
      synthesis: 'Perfil de qualidade e critério. Rende em funções técnicas, de controle e de padrão; exige apoio em ambiguidade e prazo curto.',
      roleFavors: ['Funções técnicas, analíticas e de controle', 'Qualidade, conformidade, auditoria e processos', 'Planejamento e organização de informação'],
      roleNeedsSupport: ['Operações que mudam todo dia', 'Funções de improviso e alta exposição social', 'Decisões rápidas com informação incompleta'],
      lead: {
        comunicacao: 'Escrita, organizada e com dados. Antecipe o assunto e dê tempo para análise antes da conversa.',
        delegacao: 'Delegue com critério de qualidade e prazo explícitos; combine o que é "bom o suficiente".',
        feedback: 'Específico e baseado em fato. Evite generalizações; explique o critério usado.',
        reconhecimento: 'Pela qualidade técnica, com autonomia sobre o método e confiança no padrão da pessoa.',
        evitar: 'Mudanças sem explicação, cobrança por pressa sem critério e exposição pública de erros.',
      },
      risks: [
        { risk: 'Atraso por perfeccionismo', signal: 'Entregas que ficam "quase prontas" por muito tempo.' },
        { risk: 'Rigidez com o time', signal: 'Colegas evitam pedir ajuda por medo da crítica.' },
        { risk: 'Travar diante da ambiguidade', signal: 'Pedido de mais informação quando o prazo já venceu.' },
      ],
      interview: [
        'Conte uma decisão que você precisou tomar sem todos os dados. Como lidou com isso?',
        'Como você decide quando uma entrega está boa o suficiente?',
        'Fale de uma vez em que discordou de um processo. O que fez?',
        'Como reage quando alguém entrega algo abaixo do seu padrão?',
        'Que tipo de interrupção mais atrapalha o seu trabalho e como você se organiza para evitá-la?',
      ],
    },
    bandHigh: 'Busca critério, precisão e controle de qualidade; tende ao perfeccionismo e à cautela.', bandLow: 'Mais confortável com improviso e informação incompleta; menor apego a regra e detalhe.',
    pressureUp: 'Sob pressão, aumenta o controle: confere mais, pede mais dado e pode travar a decisão.', pressureDown: 'Sob pressão, relaxa o padrão: aceita entregar com menos conferência para ganhar tempo.',
  },
};

const pairKey = (a: Style, b: Style) => (['D', 'I', 'S', 'C'] as Style[]).filter((style) => style === a || style === b).join('');

export const COMBINATIONS: Record<string, { name: string; text: string }> = {
  DI: { name: 'Mobilizador', text: 'Une decisão e influência: puxa o resultado e leva as pessoas junto. Rende abrindo frentes e liderando mudança; precisa de apoio em detalhe, rotina e acompanhamento.' },
  DS: { name: 'Realizador constante', text: 'Combina impulso de resultado com cuidado pela estabilidade do time. Executa com firmeza sem atropelar; pode oscilar entre acelerar e preservar o clima.' },
  DC: { name: 'Estrategista executor', text: 'Pensa e executa: decide rápido, mas com critério. Rende em problemas complexos com meta clara; tende a exigir muito de si e dos outros e a ter pouca paciência com o improviso alheio.' },
  IS: { name: 'Agregador', text: 'Engaja e mantém: aproxima pessoas e sustenta a relação no tempo. Rende em atendimento, integração e times que precisam de coesão; tende a evitar conflitos e decisões duras.' },
  IC: { name: 'Comunicador criterioso', text: 'Une comunicação e precisão: explica bem o que é técnico. Rende em treinamento, consultoria e relacionamento que exige conteúdo; pode oscilar entre o entusiasmo e a autocrítica.' },
  SC: { name: 'Guardião da qualidade', text: 'Constância com critério: faz certo e faz sempre. Rende em processos, controle e operações estáveis; precisa de apoio em mudança rápida e em situações de exposição.' },
};

export function combinationOf(primary: Style, secondary: Style) {
  return COMBINATIONS[pairKey(primary, secondary)];
}

export const BAND_EXPLAIN = 'Faixas: Baixo (0–39), Moderado (40–59), Alto (60–79), Muito alto (80–100). 50 significa ausência de preferência: a pessoa marcou esse estilo como "mais" e "menos" na mesma medida.';

export const CONSENT_TEXT = 'Este é um levantamento de perfil comportamental, feito para apoiar conversas de desenvolvimento e decisões de gestão. Não é exame psicológico, não mede competência e não tem resposta certa. Suas respostas ficam registradas e são acessadas por quem conduz o processo. Você pode pedir acesso ao seu resultado e à explicação do método a qualquer momento.';

export const DISCLAIMER = 'Leitura comportamental de triagem. Não é diagnóstico psicológico, não mede competência, desempenho nem potencial e não substitui avaliação profissional. Não deve ser usada como critério único de decisão.';

export const NATURAL_INSTRUCTION = 'Responda pensando em como você costuma agir no trabalho na maior parte do tempo. Não é como você gostaria de ser, nem como age em um dia atípico. Não existe resposta certa.';
export const PRESSURE_INSTRUCTION = 'Agora pense em uma semana difícil, com cobrança e prazo curto. Responda estes blocos pensando em como você age nessa semana.';
