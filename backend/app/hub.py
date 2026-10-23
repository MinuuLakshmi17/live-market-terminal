import asyncio
from dataclasses import dataclass, field

@dataclass
class Client:
    websocket: object
    symbols: set[str]
    queue: asyncio.Queue = field(default_factory=lambda: asyncio.Queue(maxsize=64))
    sender: asyncio.Task | None = None

class ConnectionHub:
    def __init__(self): self.clients = {}
    async def add(self, websocket, symbols):
        c=Client(websocket,set(symbols)); key=id(websocket); self.clients[key]=c
        c.sender=asyncio.create_task(self._sender(key,c)); return c
    async def _sender(self,key,c):
        while key in self.clients:
            await c.websocket.send_json(await c.queue.get())
    async def remove(self,websocket):
        key=id(websocket); c=self.clients.pop(key,None)
        if c and c.sender:
            c.sender.cancel()
            try: await c.sender
            except asyncio.CancelledError: pass
    async def set_symbols(self,websocket,symbols):
        if id(websocket) in self.clients: self.clients[id(websocket)].symbols=set(symbols)
    async def publish(self,msg):
        stale=[]
        for key,c in list(self.clients.items()):
            outgoing=msg
            if msg.get("type")=="tick" and msg["data"]["symbol"] not in c.symbols: continue
            if msg.get("type")=="snapshot":
                outgoing={**msg,"quotes":[q for q in msg["quotes"] if q["symbol"] in c.symbols]}
            try: c.queue.put_nowait(outgoing)
            except asyncio.QueueFull: stale.append(c.websocket)
        for ws in stale:
            try: await ws.close(code=1013,reason="Slow consumer; reconnect")
            except Exception: pass
            await self.remove(ws)
