import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { BehaviorSubject, catchError, Observable, tap } from "rxjs";
import { CryptoProvider } from '../services/crypto.service'; // adjust path if your folder layout is different



@Injectable({
  providedIn: "root",
})
export class ApiService {
  constructor(
    private router: Router,
    private http: HttpClient,
    private crypto: CryptoProvider

  ) { }
  acceptedFileType = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
  ];
  post(path: string, data: any): Observable<any> {
    return this.http.post(path, data);
  }

  postParams(path: string, body: any, params: any): Observable<any> {
    
    let param = new HttpParams(params);
    param = param.appendAll(params);
  const token = localStorage.getItem('authToken'); // or use AuthService.getToken()
  const Authtoken = this.crypto.decryptObj(token);
  // 🧠 Create headers with Bearer token
  const headers = new HttpHeaders({
    Authorization: `Bearer ${Authtoken}`,
    'Content-Type': 'application/json',
  });
    return this.http.post(path, body, { params: param,headers:headers });
  }

  get(path: string, payload: any): Observable<any> {
    let params = new HttpParams();
    params = params.appendAll(payload);

    return this.http.get(`${path}`, { params: params }).pipe();
  }


 putParams(path: string, payload: any, paramsdata: any) {
  let params = new HttpParams();
  params = params.appendAll(paramsdata);

  // 🧩 Get token (from localStorage or your auth service)
  const token = localStorage.getItem('authToken'); // or use AuthService.getToken()
  const Authtoken = this.crypto.decryptObj(token);
  // 🧠 Create headers with Bearer token
  const headers = new HttpHeaders({
    Authorization: `Bearer ${Authtoken}`,
    'Content-Type': 'application/json',
  });


  // 🚀 Return HTTP PUT request with headers and params
  return this.http.put(path, payload, { params, headers });
}

}
