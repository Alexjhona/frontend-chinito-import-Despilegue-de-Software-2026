import { Injectable } from '@angular/core';
import { Subject, auditTime } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataRefreshService {
  private readonly refreshSubject = new Subject<string>();
  readonly refresh$ = this.refreshSubject.asObservable().pipe(auditTime(200));

  notify(source = 'data-change'): void {
    this.refreshSubject.next(source);
  }
}
