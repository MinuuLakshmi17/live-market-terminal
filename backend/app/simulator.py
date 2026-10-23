from __future__ import annotations
import math, os, random
from datetime import datetime, timezone
from collections import deque

SPECS = {"AAPL":(192.40,.22),"MSFT":(425.10,.20),"NVDA":(132.80,.48),"AMZN":(186.20,.28),
         "GOOGL":(176.50,.24),"TSLA":(248.30,.62),"META":(505.20,.30),"JPM":(203.80,.18)}

class MarketSimulator:
    def __init__(self, seed=None, specs=None):
        self.rng = random.Random(int(os.getenv("MARKET_RANDOM_SEED","42")) if seed is None else seed)
        self.specs = specs or SPECS
        self.state = {}
        self.history = {s:deque(maxlen=120) for s in self.specs}
        for symbol,(price,vol) in self.specs.items():
            self.state[symbol] = dict(price=price, initial=price, vol=vol, drift=.04, volume=0,
                                      open=price, high=price, low=price,
                                      bar_time=None, bar_open=price, bar_high=price,
                                      bar_low=price, bar_volume=0)
    def symbols(self): return list(self.state)
    def _minute(self):
        return datetime.now(timezone.utc).replace(second=0,microsecond=0).isoformat()
    def candle(self, symbol):
        s=self.state[symbol]
        return {"time":s["bar_time"] or self._minute(),
                "open":round(s["bar_open"],4),"high":round(s["bar_high"],4),
                "low":round(s["bar_low"],4),"close":round(s["price"],4),
                "volume":s["bar_volume"]}
    def quote(self, symbol):
        s=self.state[symbol]; p=s["price"]; spread=max(p*.00015,.005)
        return {"symbol":symbol,"price":round(p,4),"bid":round(p-spread/2,4),"ask":round(p+spread/2,4),
                "change":round(p-s["initial"],4),"change_pct":round((p/s["initial"]-1)*100,3),
                "volume":s["volume"],"timestamp":datetime.now(timezone.utc).isoformat(),"candle":self.candle(symbol)}
    def snapshot(self, symbols=None): return [self.quote(x) for x in (symbols or self.symbols()) if x in self.state]
    def step(self, dt_seconds=.25):
        dt=max(dt_seconds,.001)/(252*6.5*60*60)
        minute=self._minute()
        for symbol,s in self.state.items():
            z=self.rng.gauss(0,1)
            s["price"]=max(.01,s["price"]*math.exp((s["drift"]-.5*s["vol"]**2)*dt+s["vol"]*math.sqrt(dt)*z))
            s["high"]=max(s["high"],s["price"]); s["low"]=min(s["low"],s["price"])
            tick_volume=self.rng.randint(10,2500)
            s["volume"]+=tick_volume
            if s["bar_time"] is None:
                s["bar_time"]=minute; s["bar_open"]=s["bar_high"]=s["bar_low"]=s["price"]
                s["bar_volume"]=0
            elif minute!=s["bar_time"]:
                self.history[symbol].append(self.candle(symbol))
                s["bar_time"]=minute; s["bar_open"]=s["bar_high"]=s["bar_low"]=s["price"]
                s["bar_volume"]=0
            else:
                s["bar_high"]=max(s["bar_high"],s["price"]); s["bar_low"]=min(s["bar_low"],s["price"])
            s["bar_volume"]+=tick_volume
        return self.snapshot()
    def candles(self,symbol,limit=60):
        if symbol not in self.state: return []
        values=list(self.history[symbol])[-max(1,min(limit,120)):]
        return values or [self.candle(symbol)]
