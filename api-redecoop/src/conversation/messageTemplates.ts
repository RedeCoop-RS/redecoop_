export const MessageTemplates = {
  pending: (): string => {
    return `Você já recebeu uma resposta!<br/><br/>Aguarde a intermediação da Rede Coop para lê-la.`;
  },
  rejected: (): string => {
    return `<span><b>Mensagem Reprovada pela RedeCoop</b><span>`;
  },
};
