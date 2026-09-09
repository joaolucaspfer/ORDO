type Listener = (name: string) => void;

const listeners = new Set<Listener>();

export function onCreatureName(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitCreatureName(name: string): void {
  listeners.forEach((l) => l(name));
}