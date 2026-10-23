import { TestBed } from '@angular/core/testing';
import { MarketStore } from './market.store';
describe('MarketStore',()=>{it('computes portfolio value and toggles watchlist',()=>{const s=TestBed.inject(MarketStore);expect(s.watchlist()).toContain('AAPL');s.toggle('AAPL');expect(s.watchlist()).not.toContain('AAPL');});});
