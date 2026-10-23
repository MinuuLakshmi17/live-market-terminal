import { Injectable, computed, signal } from '@angular/core';
import { Position, Quote } from './models';
@Injectable({providedIn:'root'})
export class MarketStore {
 readonly watchlist=signal(['AAPL','MSFT','NVDA','AMZN','GOOGL','TSLA','META','JPM']);
 readonly positions=signal<Position[]>([{symbol:'AAPL',quantity:24,averageCost:187.30},{symbol:'MSFT',quantity:10,averageCost:408.50},{symbol:'NVDA',quantity:35,averageCost:121.20},{symbol:'AMZN',quantity:8,averageCost:190}]);
 readonly quotes=signal<Map<string,Quote>>(new Map());
 readonly selectedSymbol=signal('AAPL');
 readonly marketValue=computed(()=>this.positions().reduce((s,p)=>s+p.quantity*(this.quotes().get(p.symbol)?.price??p.averageCost),0));
 readonly cost=computed(()=>this.positions().reduce((s,p)=>s+p.quantity*p.averageCost,0));
 readonly pnl=computed(()=>this.marketValue()-this.cost());
 readonly pnlPct=computed(()=>this.cost()?this.pnl()/this.cost()*100:0);
 setQuotes(q:Map<string,Quote>){this.quotes.set(new Map(q));}
 select(s:string){this.selectedSymbol.set(s);}
 toggle(s:string){this.watchlist.update(xs=>xs.includes(s)?xs.filter(x=>x!==s):[...xs,s]);}
}
