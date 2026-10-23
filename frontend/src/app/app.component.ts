import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { auditTime } from 'rxjs';
import { MarketDataService } from './market-data.service';
import { MarketStore } from './market.store';
import { Quote, TickRow } from './models';

@Component({selector:'lmt-root',standalone:true,imports:[CommonModule],template:`
<div class="app-shell">
<header><div class="brand"><div class="logo">LM</div><div><h1>Market Terminal</h1><small>LIVE SIMULATED MARKETS</small></div></div><div class="header-right"><span>{{ clock() }}</span><b class="status" [class.live]="(data.status$|async)==='live'">{{ data.status$|async }}</b></div></header>
<main>
<div class="ticker-strip">@for(s of store.watchlist();track s){@if(store.quotes().get(s);as q){<button (click)="select(s)" [class.active]="store.selectedSymbol()===s"><span>{{s}}</span><strong>{{q.price|number:'1.2-2'}}</strong><small [class.down]="q.change<0">{{q.change_pct>=0?'+':''}}{{q.change_pct|number:'1.2-2'}}%</small></button>}}</div>
<div class="metrics">
<article><label>PORTFOLIO VALUE</label><strong>\${{store.marketValue()|number:'1.2-2'}}</strong><small>{{store.positions().length}} open positions</small></article>
<article><label>UNREALIZED P&amp;L</label><strong [class.down]="store.pnl()<0">{{store.pnl()>=0?'+':'−'}}\${{abs(store.pnl())|number:'1.2-2'}}</strong><small [class.down]="store.pnlPct()<0">{{store.pnlPct()|number:'1.2-2'}}% return</small></article>
<article><label>SELECTED ASSET</label><strong>{{selected()?.symbol||store.selectedSymbol()}}</strong><small>{{selected()?.price|number:'1.2-2'}} USD · simulated</small></article>
<article><label>STREAM STATUS</label><strong class="green">{{(data.status$|async)==='live'?'Connected':'Reconnecting'}}</strong><small>WebSocket · RxJS throttled</small></article>
</div>
<div class="main-grid">
<section class="panel chart-panel"><div class="panel-head"><div><label>MARKET OVERVIEW</label><h2>{{store.selectedSymbol()}} <small>/ USD</small></h2></div><div class="tabs"><button [class.active]="mode()==='line'" (click)="mode.set('line')">Line</button><button [class.active]="mode()==='candle'" (click)="mode.set('candle')">Candles</button></div></div>
@if(selected();as q){<div class="price">{{q.price|number:'1.2-2'}} <small [class.down]="q.change<0">{{q.change>=0?'+':''}}{{q.change|number:'1.2-2'}} ({{q.change_pct|number:'1.2-2'}}%)</small></div>}
<svg viewBox="0 0 800 250" preserveAspectRatio="none" role="img" aria-label="Live market chart">
@for(y of grid;track y){<line x1="0" [attr.y1]="y" x2="800" [attr.y2]="y" class="grid"/>}
@if(mode()==='line'){<polyline [attr.points]="linePoints()" class="line"/>}@else{@for(c of candles();track $index){<line [attr.x1]="c.x" [attr.x2]="c.x" [attr.y1]="c.hi" [attr.y2]="c.lo" [class.up]="c.up" [class.down]="!c.up"/><rect [attr.x]="c.x-3" [attr.y]="Math.min(c.o,c.c)" width="6" [attr.height]="Math.max(1,Math.abs(c.c-c.o))" [class.up]="c.up" [class.down]="!c.up"/>}}
</svg><div class="chart-footer"><span>INTRADAY SIMULATION</span><span>{{lastUpdate()||'Waiting for feed…'}}</span></div></section>
<section class="panel"><div class="panel-head"><div><label>MARKET UNIVERSE</label><h2>Watchlist</h2></div><span class="badge">{{store.watchlist().length}} assets</span></div><div class="table-wrap"><table><thead><tr><th>Asset</th><th>Last</th><th>Change</th><th></th></tr></thead><tbody>@for(s of store.watchlist();track s){@if(store.quotes().get(s);as q){<tr [class.selected]="store.selectedSymbol()===s" (click)="select(s)"><td><b>{{s}}</b><small>{{names[s]||'Equity'}}</small></td><td>{{q.price|number:'1.2-2'}}</td><td [class.down]="q.change<0">{{q.change_pct>=0?'+':''}}{{q.change_pct|number:'1.2-2'}}%</td><td><button class="remove" (click)="toggle(s,$event)" [attr.aria-label]="'Remove '+s">×</button></td></tr>}}</tbody></table></div></section>
</div>
<div class="lower-grid">
<section class="panel"><div class="panel-head"><div><label>POSITIONS</label><h2>Portfolio</h2></div><span class="badge">{{store.positions().length}} open</span></div><div class="table-wrap"><table><thead><tr><th>Symbol</th><th>Qty</th><th>Avg cost</th><th>Market value</th><th>Unrealized P&amp;L</th></tr></thead><tbody>@for(p of store.positions();track p.symbol){@if(store.quotes().get(p.symbol);as q){<tr><td><b>{{p.symbol}}</b></td><td>{{p.quantity}}</td><td>{{p.averageCost|number:'1.2-2'}}</td><td>{{p.quantity*q.price|number:'1.2-2'}}</td><td [class.down]="q.price<p.averageCost">{{(q.price-p.averageCost)*p.quantity|number:'1.2-2'}}</td></tr>}}</tbody></table></div></section>
<section class="panel"><div class="panel-head"><div><label>LEVEL II · SIMULATED</label><h2>Order book</h2></div><span class="badge">{{store.selectedSymbol()}}</span></div><div class="book-head"><span>SIZE</span><span>BID</span><span>ASK</span><span>SIZE</span></div>@for(l of book();track $index){<div class="book-row"><span>{{l.bs}}</span><b>{{l.bid|number:'1.2-2'}}</b><b class="ask">{{l.ask|number:'1.2-2'}}</b><span>{{l.as}}</span><div class="depth bid-depth" [style.width.%]="l.bd"></div><div class="depth ask-depth" [style.width.%]="l.ad"></div></div>}</section>
</div>
<section class="panel ticks"><div class="panel-head"><div><label>LIVE TAPE</label><h2>Recent ticks</h2></div><span class="badge">Latest {{rows().length}}</span></div><div class="table-wrap tick-wrap"><table><thead><tr><th>Time</th><th>Symbol</th><th>Last price</th><th>Volume</th><th>Direction</th></tr></thead><tbody>@for(t of rows();track t.id){<tr><td>{{t.timestamp|date:'HH:mm:ss.SSS'}}</td><td><b>{{t.symbol}}</b></td><td>{{t.price|number:'1.2-2'}}</td><td>{{t.volume|number}}</td><td [class.down]="t.price<0">{{t.price>=0?'● LIVE':'● LIVE'}}</td></tr>}</tbody></table></div></section>
<footer><span>LIVE MARKET TERMINAL · v1.0</span><span>SYNTHETIC DATA ONLY · NOT FINANCIAL ADVICE</span><span>Angular · RxJS · FastAPI</span></footer>
</main></div>
`})
export class AppComponent implements OnInit {
 readonly store=inject(MarketStore); readonly data=inject(MarketDataService); private destroy=inject(DestroyRef);
 readonly mode=signal<'line'|'candle'>('line'); readonly rows=signal<TickRow[]>([]); readonly history=signal<Map<string,number[]>>(new Map());
 readonly candleHistory=signal<Map<string,{o:number;h:number;l:number;c:number}[]>>(new Map()); readonly candleBuckets=new Map<string,{start:number;o:number;h:number;l:number;c:number}>(); readonly lastUpdate=signal('');
 readonly clock=signal(new Date().toLocaleTimeString()); readonly grid=[20,72,124,176,228]; readonly Math=Math;
 readonly names:Record<string,string>={AAPL:'Apple Inc.',MSFT:'Microsoft',NVDA:'NVIDIA',AMZN:'Amazon',GOOGL:'Alphabet',TSLA:'Tesla',META:'Meta Platforms',JPM:'JPMorgan Chase'};
 readonly selected=computed(()=>this.store.quotes().get(this.store.selectedSymbol()));
 readonly linePoints=computed(()=>{const a=this.history().get(this.store.selectedSymbol())||[];if(a.length<2)return '';const lo=Math.min(...a),hi=Math.max(...a),span=hi-lo||.01;return a.map((v,i)=>`${5+i/Math.max(1,a.length-1)*790},${230-(v-lo)/span*205}`).join(' ');});
 readonly candles=computed(()=>{const a=this.candleHistory().get(this.store.selectedSymbol())||[];if(!a.length)return [];const vals=a.flatMap(c=>[c.h,c.l]),lo=Math.min(...vals),hi=Math.max(...vals),span=hi-lo||.01,y=(v:number)=>230-(v-lo)/span*205,step=790/a.length;return a.map((c,i)=>({x:5+i*step,hi:y(c.h),lo:y(c.l),o:y(c.o),c:y(c.c),up:c.c>=c.o}));});
 readonly book=computed(()=>{const q=this.selected();if(!q)return [];return Array.from({length:8},(_,i)=>{const off=(7-i)*Math.max(q.price*.0001,.01),bs=100+((i*73+q.volume)%900),as=100+((i*97+q.volume*3)%900);return {bid:q.bid-off,ask:q.ask+off,bs,as,bd:15+bs/1000*70,ad:15+as/1000*70};});});
 ngOnInit(){this.data.quotes$.pipe(takeUntilDestroyed(this.destroy)).subscribe(q=>this.store.setQuotes(q));this.data.ticks$.pipe(auditTime(100),takeUntilDestroyed(this.destroy)).subscribe(q=>{this.lastUpdate.set(new Date(q.timestamp).toLocaleTimeString());this.history.update(m=>{const n=new Map(m);n.set(q.symbol,[...(n.get(q.symbol)||[]),q.price].slice(-100));return n;});const bt=Math.floor(Date.parse(q.timestamp)/2000)*2000;const cur=this.candleBuckets.get(q.symbol);if(!cur||cur.start!==bt){const b={start:bt,o:q.price,h:q.price,l:q.price,c:q.price};this.candleBuckets.set(q.symbol,b);this.candleHistory.update(m=>{const n=new Map(m);n.set(q.symbol,[...(n.get(q.symbol)||[]),{o:b.o,h:b.h,l:b.l,c:b.c}].slice(-55));return n;});}else{cur.h=Math.max(cur.h,q.price);cur.l=Math.min(cur.l,q.price);cur.c=q.price;this.candleHistory.update(m=>{const n=new Map(m);const a=[...(n.get(q.symbol)||[])];if(a.length)a[a.length-1]={o:cur.o,h:cur.h,l:cur.l,c:cur.c};n.set(q.symbol,a);return n;});}this.rows.update(a=>[{id:q.symbol+q.timestamp,symbol:q.symbol,price:q.price,timestamp:q.timestamp,volume:q.volume},...a].slice(0,100));});setInterval(()=>this.clock.set(new Date().toLocaleTimeString()),1000);}
 select(s:string){this.store.select(s);} toggle(s:string,e:MouseEvent){e.stopPropagation();this.store.toggle(s);} abs(v:number){return Math.abs(v);}
}
