from app.simulator import MarketSimulator

def test_seeded_reproducibility():
    a,b=MarketSimulator(seed=17),MarketSimulator(seed=17)
    assert [q["price"] for q in a.step()]==[q["price"] for q in b.step()]
def test_quote_invariants():
    m=MarketSimulator(seed=1)
    for _ in range(20): m.step()
    for q in m.snapshot():
        assert q["price"]>0 and q["bid"]<q["price"]<q["ask"] and q["volume"]>0
def test_candle_ohlc():
    m=MarketSimulator(seed=2); m.step()
    c=m.candles("AAPL")[0]
    assert c["low"]<=c["open"]<=c["high"] and c["low"]<=c["close"]<=c["high"]
def test_unknown_symbol():
    assert MarketSimulator().candles("NOPE")==[]
