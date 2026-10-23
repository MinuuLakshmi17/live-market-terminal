export interface Candle { time:string; open:number; high:number; low:number; close:number; volume:number; }
export interface Quote { symbol:string; price:number; bid:number; ask:number; change:number; change_pct:number; volume:number; timestamp:string; candle?:Candle|null; }
export interface Envelope { type:string; data?:Quote; quotes?:Quote[]; timestamp?:string; message?:string; }
export interface Position { symbol:string; quantity:number; averageCost:number; }
export interface TickRow { id:string; symbol:string; price:number; timestamp:string; volume:number; }
