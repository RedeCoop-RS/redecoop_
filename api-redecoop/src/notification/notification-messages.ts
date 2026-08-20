import moment from 'moment-timezone';

export const NotificationMessages = {
  NEW_MESSAGE: (cooperativeName: string, messagePreview: string, conversationId: number) =>
    `<b>Mensagem</b> de ${cooperativeName}: "${messagePreview.length > 80 ? messagePreview.slice(0, 80) + '...' : messagePreview}".<cid>${conversationId}</cid>`,

  NEW_PROPOSAL_TRAVEL: (date: Date) =>
    `Você recebeu uma proposta na sua viagem do dia <date>${date.toISOString()}</date>`,

  PROPOSAL_TRAVEL_REJECTED: (date: Date) =>
    `Sua proposta de viagem para o dia <date>${date.toISOString()}</date> foi rejeitada.`,

  PROPOSAL_TRAVEL_ACCEPTED: (date: Date) =>
    `Sua proposta de viagem para o dia <date>${date.toISOString()}</date> foi aceita.`,

  PROPOSAL_TRAVEL_CANCELED: (date: Date) =>
    `Uma proposta na sua viagem do dia <date>${date.toISOString()}</date> foi cancelada.`,

  PROPOSAL_TRAVEL_MODIFIED: (date: Date) =>
    `Uma proposta na sua viagem do dia <date>${date.toISOString()}</date> foi modificada.`,

  MESSAGE_DENIED: (date: Date) =>
    `Uma mensagem enviada na proposta para viagem do dia <date>${date.toISOString()}</date> foi negada por violar os termos.`,
};
