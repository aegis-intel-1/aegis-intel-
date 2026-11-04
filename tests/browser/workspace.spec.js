import {test,expect} from '@playwright/test';
test('case, identifier, notes, import, verification and export workflow',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'New investigation'}).click();
 await page.getByLabel('Case title').fill('Browser verification case');await page.getByLabel('Scope and objective').fill('Controlled end-to-end validation.');await page.getByRole('button',{name:'Create investigation'}).click();
 await expect(page.getByRole('heading',{name:'Browser verification case'})).toBeVisible();
 await page.getByRole('button',{name:'identifiers',exact:true}).click();await page.getByRole('button',{name:'Add identifier'}).click();
 await page.getByLabel('Value',{exact:true}).fill('example.org');await page.getByRole('dialog').getByRole('button',{name:'Add identifier'}).click();
 await expect(page.getByText('example.org',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'notes',exact:true}).click();await page.getByRole('button',{name:'Add note'}).click();await page.getByLabel('Observation or hypothesis').fill('A controlled note; no identity conclusion.');await page.getByRole('button',{name:'Save note'}).click();
 await expect(page.getByText('A controlled note; no identity conclusion.')).toBeVisible();
 await page.getByRole('button',{name:'Import original'}).click();await page.locator('input[type=file]').setInputFiles({name:'fixture.txt',mimeType:'text/plain',buffer:Buffer.from('original evidence fixture')});await page.getByRole('button',{name:'Preserve original'}).click();
 await page.getByRole('button',{name:'evidence',exact:true}).click();await expect(page.getByText('fixture.txt',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Verify fixture.txt'}).click();await expect(page.getByRole('status')).toContainText('SHA-256 and size match');
 await page.getByRole('button',{name:'reports',exact:true}).click();
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'Evidence bundle',exact:true}).click();expect((await download).suggestedFilename()).toMatch(/\.zip$/);
});
test('local tool output is preserved and graph renders',async({page})=>{
 await page.goto('/#tools');await page.getByRole('button',{name:/SHA-256 text digest/}).click();await page.getByLabel('Query input').fill('known bytes');await page.getByRole('combobox',{name:'Investigation'}).selectOption({label:'Browser verification case'});await page.getByRole('button',{name:'Run research'}).click();
 await expect(page.getByText('Research completed',{exact:true})).toBeVisible();await expect(page.locator('.tool-output')).toContainText('sha256');
 await page.goto('/#analysis');await expect(page.getByRole('img',{name:'Cases connected to their recorded identifiers'})).toBeVisible();
});
test('all primary routes render without browser exceptions',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const route of ['overview','cases','collection','evidence','tools','analysis','monitors','reports','activity','settings','guide','pricing']){await page.goto('/#'+route);await expect(page.locator('h1')).toBeVisible();}
 expect(errors).toEqual([]);
 await page.setViewportSize({width:1440,height:1000});await page.goto('/#overview');await expect(page.locator('.stat-row')).toBeVisible();await page.screenshot({path:'test-results/overview.png',fullPage:true});
});
test('mobile workspace fits without horizontal overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('h1')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Toggle navigation'}).click();await page.getByRole('link',{name:'Collection studio',exact:true}).click();await expect(page.getByRole('heading',{name:'Collection studio'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
