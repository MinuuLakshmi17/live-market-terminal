import { Injectable, NgZone, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject, auditTime, map, retry, share, takeUntil, timer } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Envelope, Quote } from './models';

@Injectable({providedIn:'root'})
export class MarketDataService implements OnDestroy {
 private zone=inject(NgZone);
 private socket?:WebSocketSubject<unknown>;
 private stop$=new Subject<void>();
 private quoteMap=new BehaviorSubject<Map<string,Quote>>(new Map());
 private statusSubject=new BehaviorSubject<'connecting'|'live'|'offline'>('connecting');
 readonly quotes$=this.quoteMap.asObservable();
 readonly status$=this.statusSubject.asObservable();
 readonly ticks$:Observable<Quote>;
 constructor() {
  this.ticks$=new Observable<Quote>(subscriber=>{
   this.statusSubject.next('connecting');
   const protocol=window.location.protocol==='https:'?'wss:':'ws:';
   const host=window.location.hostname||'localhost';
   this.socket=webSocket<unknown>({
    url:`${protocol}//${host}:8000/ws/market`,
    openObserver:{next:()=>this.zone.run(()=>{this.statusSubject.next('live');this.socket?.next({type:'subscribe',symbols:['AAPL','MSFT','NVDA','AMZN','GOOGL','TSLA','META','JPM']});})},
    closeObserver:{next:()=>this.zone.run(()=>this.statusSubject.next('offline'))}
   });
   const sub=this.socket.pipe(map(v=>v as Envelope),takeUntil(this.stop$)).subscribe({
    next:m=>this.zone.run(()=>{
     if(m.type==='snapshot'&&m.quotes){const next=new Map(this.quoteMap.value);m.quotes.forEach(q=>next.set(q.symbol,q));this.quoteMap.next(next);}
     if(m.type==='tick'&&m.data){const next=new Map(this.quoteMap.value);next.set(m.data.symbol,m.data);this.quoteMap.next(next);subscriber.next(m.data);}
    }),
    error:e=>this.zone.run(()=>subscriber.error(e)),
    complete:()=>this.zone.run(()=>this.statusSubject.next('offline'))
   });
   return ()=>{sub.unsubscribe();this.socket?.complete();this.socket=undefined;};
  }).pipe(retry({delay:(_e,n)=>timer(Math.min(1000*2**Math.min(n,5),15000))}),share());
  this.ticks$.pipe(auditTime(100),takeUntil(this.stop$)).subscribe();
 }
 ngOnDestroy(){this.stop$.next();this.stop$.complete();this.socket?.complete();this.quoteMap.complete();this.statusSubject.complete();}
}
