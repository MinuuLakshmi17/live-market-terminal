import asyncio, json, os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .simulator import MarketSimulator
from .hub import ConnectionHub

interval=max(.05,float(os.getenv("MARKET_TICK_INTERVAL","0.25")))
market=MarketSimulator(); hub=ConnectionHub(); feed_task=None
async def feed():
    while True:
        for quote in market.step(interval):
            await hub.publish({"type":"tick","data":quote,"timestamp":datetime.now(timezone.utc).isoformat()})
        await asyncio.sleep(interval)
@asynccontextmanager
async def lifespan(app):
    global feed_task
    feed_task=asyncio.create_task(feed())
    yield
    feed_task.cancel()
    try: await feed_task
    except asyncio.CancelledError: pass
app=FastAPI(title="Live Market Terminal API",version="1.0.0",lifespan=lifespan)
app.add_middleware(CORSMiddleware,allow_origins=["*"],allow_methods=["*"],allow_headers=["*"])
@app.get("/health")
async def health(): return {"status":"ok","symbols":market.symbols(),"clients":len(hub.clients)}
@app.get("/api/quotes")
async def quotes(): return market.snapshot()
@app.get("/api/candles/{symbol}")
async def candles(symbol:str,limit:int=Query(60,ge=1,le=120)):
    symbol=symbol.upper()
    if symbol not in market.state: raise HTTPException(404,"Unknown symbol")
    return market.candles(symbol,limit)
@app.websocket("/ws/market")
async def socket(ws:WebSocket):
    await ws.accept(); symbols=market.symbols(); await hub.add(ws,symbols)
    await hub.publish({"type":"snapshot","quotes":market.snapshot(symbols)})
    try:
        while True:
            try: msg=json.loads(await ws.receive_text())
            except json.JSONDecodeError:
                await ws.send_json({"type":"error","message":"Invalid JSON"}); continue
            if msg.get("type")=="subscribe":
                requested=msg.get("symbols",[])
                if not isinstance(requested,list):
                    await ws.send_json({"type":"error","message":"symbols must be a list"}); continue
                symbols=[str(s).upper() for s in requested if str(s).upper() in market.state]
                await hub.set_symbols(ws,symbols)
                await ws.send_json({"type":"snapshot","quotes":market.snapshot(symbols)})
            elif msg.get("type")=="ping":
                await ws.send_json({"type":"heartbeat","timestamp":datetime.now(timezone.utc).isoformat()})
            else: await ws.send_json({"type":"error","message":"Supported types: subscribe, ping"})
    except WebSocketDisconnect: pass
    finally: await hub.remove(ws)
