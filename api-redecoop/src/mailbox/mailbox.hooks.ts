type Listener = () => void;

const listeners = new Set<Listener>();

export function onMailboxAccountChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyMailboxAccountChanged(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // O agendador trata a própria reconexão.
    }
  }
}
