// src/app/core/services/crypto.service.ts
import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';

@Injectable({
  providedIn: 'root',
})
export class CryptoProvider {
  // NOTE: For production, move this secret into environment and do not commit it.
  private readonly SECRET_KEY = 'CHANGE_ME_TO_A_STRONG_SECRET';

  constructor() {}

  // Accepts any JSON-able object or string. Returns encrypted string.
  encryptObj(value: any): string {
    try {
      const plain = typeof value === 'string' ? value : JSON.stringify(value);
      return CryptoJS.AES.encrypt(plain, this.SECRET_KEY).toString();
    } catch (err) {
      console.error('CryptoProvider.encryptObj error', err);
      throw err;
    }
  }

  // Accepts encrypted string, returns original object or string (if parseable JSON).
  decryptObj(enc: string | null): any {
    try {
      if (!enc) return null;
      const bytes = CryptoJS.AES.decrypt(enc as string, this.SECRET_KEY);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) return null;
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (err) {
      console.warn('CryptoProvider.decryptObj error', err);
      return null;
    }
  }
}
