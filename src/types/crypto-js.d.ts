declare module 'crypto-js' {
  export function HmacSHA1(message: string, key: string): any;
  export const enc: {
    Base64: {
      stringify(wordArray: any): string;
    };
  };
} 