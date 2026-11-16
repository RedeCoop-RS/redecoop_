import { fromMinor, toMinor } from './quantity';

export interface DivisionParticipant {
  id: number;
  /** null = sem teto de capacidade. */
  maxCapacity: number | null;
}

export interface DivisionAllocation {
  id: number;
  quantity: number;
}

export interface DivisionResult {
  allocations: DivisionAllocation[];
  unallocated: number;
  insufficientCapacity: boolean;
}

/**
 * Divide a quantidade em partes iguais entre os participantes.
 * Quem tem capacidade máxima abaixo da cota fica no teto, e o saldo
 * é redistribuído igualmente entre os demais. O processo se repete
 * quando o novo rateio estoura outro teto. O resto de arredondamento
 * (milésimos) é distribuído 1 a 1, na ordem recebida, para a soma
 * das cotas mais o saldo não alocado fechar com o total.
 */
export function divideQuantity(total: number, participants: DivisionParticipant[]): DivisionResult {
  const totalMinor = toMinor(total);
  const open = participants.map((participant) => ({
    id: participant.id,
    cap:
      participant.maxCapacity === null || participant.maxCapacity === undefined
        ? null
        : toMinor(participant.maxCapacity),
  }));
  const assigned = new Map<number, number>();
  let remaining = totalMinor;

  while (open.length > 0) {
    const count = open.length;
    const base = Math.floor(remaining / count);
    const extra = remaining % count;
    const proposed = open.map((_, index) => base + (index < extra ? 1 : 0));
    const blocked: number[] = [];

    for (let index = 0; index < open.length; index++) {
      const cap = open[index].cap;
      if (cap !== null && proposed[index] > cap) blocked.push(index);
    }

    if (blocked.length === 0) {
      open.forEach((participant, index) => assigned.set(participant.id, proposed[index]));
      remaining = 0;
      break;
    }

    for (let cursor = blocked.length - 1; cursor >= 0; cursor--) {
      const index = blocked[cursor];
      const participant = open[index];
      const cap = participant.cap ?? 0;
      assigned.set(participant.id, cap);
      remaining -= cap;
      open.splice(index, 1);
    }

    if (remaining < 0) remaining = 0;
  }

  return {
    allocations: participants.map((participant) => ({
      id: participant.id,
      quantity: fromMinor(assigned.get(participant.id) ?? 0),
    })),
    unallocated: fromMinor(remaining),
    insufficientCapacity: remaining > 0,
  };
}
