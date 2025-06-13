declare global {
  interface Window {
    memoryMap: Map<
      string,
      { timerId: any; expiresAt: number; ids: Set<string> }
    >;
  }
}

// This export is needed to make the file a module
export {};
