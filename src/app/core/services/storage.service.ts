import { Injectable } from "@angular/core";
import { Observable, Subject } from "rxjs";
import { CryptoProvider } from "./crypto.service";

@Injectable({
  providedIn: "root",
})
export class LocalStorageService {
  private langUpdated = new Subject<string>();

  constructor(private crypto: CryptoProvider) { }

  private isLocalStorageAvailable(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  setItem(key: string, value: any) {
    if (this.isLocalStorageAvailable()) {
      const encStoreInfo = this.crypto.encryptObj(value);
      localStorage.setItem(key, encStoreInfo);
    } else {
      console.error('localStorage is not available');
    }
  }



  
  removeItem(key: any) {
    if (this.isLocalStorageAvailable()) {
      localStorage.removeItem(key);
    } else {
      console.error('localStorage is not available');
    }
  }

  removeAllItem() {
    if (this.isLocalStorageAvailable()) {
      localStorage.clear();
    } else {
      console.error('localStorage is not available');
    }
  }

  getItem(key: string): any {
    try {
      if (this.isLocalStorageAvailable()) {
        let localStorageInfo;
        const encStoreInfo = localStorage.getItem(key);
        if (encStoreInfo) {
          localStorageInfo = this.crypto.decryptObj(localStorage.getItem(key));
        }
        return localStorageInfo;
      } else {
        console.error('localStorage is not available');
        return null;
      }
    } catch (err) {
      return "";
    }
  }

  removeItems(keyArray: any) {
    if (this.isLocalStorageAvailable()) {
      keyArray.forEach((key:any) => localStorage.removeItem(key));
    } else {
      console.error('localStorage is not available');
    }
  }

  storageclear() {
    if (this.isLocalStorageAvailable()) {
      localStorage.clear();
    } else {
      console.error('localStorage is not available');
    }
  }

  storeinSession(key: string, data: any) {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(key, data);
    } else {
      console.error('sessionStorage is not available');
    }
  }

  getdatafromSession(key: any) {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem(key);
    } else {
      console.error('sessionStorage is not available');
      return null;
    }
  }

  sessionStorageclear() {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    } else {
      console.error('sessionStorage is not available');
    }
  }

  getLang(): Observable<string> {
    return this.langUpdated.asObservable();
  }

  setLang() {
    const lang = this.getItem("currentlang");
    this.langUpdated.next(lang ? lang : "en");
  }
}
