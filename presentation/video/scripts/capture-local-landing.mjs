import {chromium} from '/Users/andrkrupenko/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const scratch='/Users/andrkrupenko/Documents/ChatGPT/Nick/work/kinetic-core-video/qa-landing';
const output='/Users/andrkrupenko/Documents/ChatGPT/Nick/Hakaton2026/presentation/video/remotion/public/footage/moon-landing-qa.webm';
const browser=await chromium.launch({headless:true,executablePath:'/Users/andrkrupenko/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',args:['--enable-webgl','--use-angle=swiftshader','--no-sandbox']});
const context=await browser.newContext({viewport:{width:1600,height:900},recordVideo:{dir:scratch,size:{width:1600,height:900}}});
const page=await context.newPage();const records=[];const start=Date.now();
page.on('pageerror',e=>records.push({seconds:(Date.now()-start)/1000,error:e.message}));
await page.goto('http://127.0.0.1:5188/',{waitUntil:'networkidle',timeout:60000});
await page.waitForTimeout(1000);
await page.locator('#landing-practice').click();
await page.waitForTimeout(600);
const assist=page.locator('#landing-assist-button');
if(await assist.getAttribute('aria-pressed')!=='true')await assist.click();
if(await page.locator('#resume-button').isVisible())await page.locator('#resume-button').click();
const motionStart=(Date.now()-start)/1000;
console.log(JSON.stringify({event:'motion-start',seconds:motionStart}));
let success=false;
for(let i=0;i<100;i++){
 await page.waitForTimeout(2000);
 const text=await page.locator('body').innerText();
 const record={seconds:(Date.now()-start)/1000,text};records.push(record);
 console.log(JSON.stringify({seconds:record.seconds,telemetry:text.match(/Mission elapsed time[\s\S]{0,150}/)?.[0],result:text.includes('Touchdown confirmed')?'landed':text.includes('Unsafe contact')?'failed':'flying'}));
 if(text.includes('Touchdown confirmed')||text.includes('Landed safely')){success=true;await page.screenshot({path:scratch+'/success.png'});await page.waitForTimeout(3000);break;}
 if(text.includes('Flight debrief')&&text.includes('impact')){await page.screenshot({path:scratch+'/failure.png'});break;}
}
const final=await page.locator('body').innerText();
await page.screenshot({path:scratch+'/final.png'});
const source=await page.video().path();
await context.close();await browser.close();
await fs.copyFile(source,output);
const metadata={url:'http://127.0.0.1:5188/',version:'0.4.4',scenario:'Local Moon terminal landing rehearsal, separate from Earth-to-Moon transfer',controls:'Ordinary visible UI: Surface landing practice, Landing assist on, Resume flight',simulationAccelerationHookUsed:false,telemetryFabricated:false,success,motionStartSeconds:motionStart,wallDurationSeconds:(Date.now()-start)/1000,video:output,records,finalText:final};
await fs.writeFile(scratch+'/capture-provenance.json',JSON.stringify(metadata,null,2));
console.log(JSON.stringify({event:'finished',success,path:output,motionStartSeconds:motionStart,wallDurationSeconds:metadata.wallDurationSeconds}));
