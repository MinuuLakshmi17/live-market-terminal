import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
describe('AppComponent',()=>{it('renders terminal panels',()=>{TestBed.configureTestingModule({imports:[AppComponent]});const f=TestBed.createComponent(AppComponent);f.detectChanges();expect(f.nativeElement.textContent).toContain('Market Terminal');expect(f.nativeElement.textContent).toContain('Watchlist');expect(f.nativeElement.textContent).toContain('Portfolio');f.destroy();});});
