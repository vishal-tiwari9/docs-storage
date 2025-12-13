// global.d.ts

interface EthereumProvider {
  isMetaMask?: boolean;
  request: (...args: any[]) => Promise<any>;
  // Add more methods if you call them, e.g., on, removeListener, etc.
}

interface Window {
  ethereum?: EthereumProvider;
}
