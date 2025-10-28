// Start of Event Service code
import { Observable, Subject } from "rxjs";
import { Injectable } from "@angular/core";
import { filter, map } from "rxjs/operators";

// Used to store key value pairs
interface Event {
  key: string;
  value: any;
}

@Injectable({
  providedIn: "root",
})
export class EventService {
  protected eventsSubject = new Subject<Event>();
  public count: number = 0;
  ignoreList: Array<any> = [];
  previousid: any;

  /*Method is responsible for Broadcast Event */
  public broadcastEvent(key: string, value: any): void {
    this.eventsSubject.next({ key, value });
  }

  /* Method is responsible for Get Event*/
  public getEvent(key: string): Observable<any> {
    return this.eventsSubject.asObservable().pipe(
      filter((e) => e.key === key),
      map((e) => e.value)
    );
  }
  checkList(url: string): boolean {
    const matched = this.ignoreList.filter((element) => url.includes(element));
    return matched.length > 0 ? false : true;
  }
}
