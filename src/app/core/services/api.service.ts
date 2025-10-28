import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { BehaviorSubject, catchError, Observable, tap } from "rxjs";
import { ToastrService } from "ngx-toastr";


@Injectable({
  providedIn: "root",
})
export class ApiService {
  constructor(
    private router: Router,
    private http: HttpClient,
    private toastr: ToastrService,

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
    return this.http.post(path, body, { params: param });
  }

  get(path: string, payload: any): Observable<any> {
    let params = new HttpParams();
    params = params.appendAll(payload);

    return this.http.get(`${path}`, { params: params }).pipe();
  }
}
