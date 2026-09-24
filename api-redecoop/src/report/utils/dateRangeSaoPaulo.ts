import * as moment from 'moment-timezone';

/** Intervalo [início do dia, fim do dia] em America/Sao_Paulo, como Date UTC. */
export function dateRangeSaoPaulo(startDate: string, endDate: string): { start: Date; end: Date } {
  return {
    start: moment.tz(startDate, 'YYYY-MM-DD', 'America/Sao_Paulo').startOf('day').toDate(),
    end: moment.tz(endDate, 'YYYY-MM-DD', 'America/Sao_Paulo').endOf('day').toDate(),
  };
}
