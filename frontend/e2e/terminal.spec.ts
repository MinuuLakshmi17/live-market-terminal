import {test,expect} from '@playwright/test';
test('renders market terminal and panels',async({page})=>{await page.goto('/');await expect(page.getByRole('heading',{name:'Market Terminal'})).toBeVisible();await expect(page.getByText('Watchlist')).toBeVisible();await expect(page.getByText('Portfolio')).toBeVisible();});
