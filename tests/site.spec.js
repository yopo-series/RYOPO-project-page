import { test, expect } from '@playwright/test';
test('desktop content, benchmark tabs, accessible diagram zoom', async ({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await expect(page).toHaveTitle(/RYOPO/);
  await expect(page.getByRole('heading',{level:1})).toContainText('Bringing End-to-End');
  await expect(page.locator('#motion-toggle')).toHaveText(/Play previews/);
  await expect(page.locator('a[href$=".pdf"]')).toHaveCount(0);
  await expect(page.locator('#live-demo .runtime-summary')).toContainText('≤30 FPS');
  await expect(page.locator('.runtime-details, #live-runtime')).toHaveCount(0);
  await expect(page.locator('#live-demo')).not.toContainText('Runtime measurement scopes and training details');
  await expect(page.locator('#live-demo')).not.toContainText('47–59 FPS');
  await page.getByRole('tab',{name:'CAMERA25',exact:true}).click();
  await expect(page.locator('#accuracy-table .ours')).toContainText('98.6');
  await page.getByRole('tab',{name:'HouseCat6D',exact:true}).click();
  await expect(page.locator('#accuracy-table tbody tr')).toHaveCount(4);
  await expect(page.locator('#metric-protocol')).toContainText('not ground-truth');
  await page.getByRole('tab',{name:'HouseCat6D',exact:true}).press('ArrowRight');
  await expect(page.getByRole('tab',{name:'REAL275',exact:true})).toHaveAttribute('aria-selected','true');
  await page.getByRole('button',{name:'Enlarge the RYOPO architecture diagram',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect.poll(()=>page.locator('#dialog-image').evaluate(i=>i.complete && i.naturalWidth>0)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(errors).toEqual([]);
  // Trigger lazy images before taking the full-page preview.
  for (const image of await page.locator('main img[loading="lazy"]').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(()=>image.evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
  }
  await page.evaluate(()=>{document.activeElement.blur();window.scrollTo(0,0);});
  await page.screenshot({path:'test-results/desktop.png',fullPage:true});
  await page.screenshot({path:'test-results/desktop-top.png'});
});
test('sequence controls change real video without the visualization protocol section', async ({page})=>{
  await page.goto('/');
  await expect(page.locator('#sequence-select')).toBeVisible();
  await expect(page.locator('#comparisons details')).toHaveCount(0);
  await page.getByRole('button',{name:'HouseCat6D',exact:true}).click();
  await page.selectOption('#sequence-select','test_scene3');
  await expect(page.locator('#comparisons')).not.toContainText('Visualization protocol');
  await expect(page.locator('#comparison-video source')).toHaveAttribute('src','assets/videos/housecat6d-test_scene3.mp4');
  const v=page.locator('#comparison-video');
  await v.evaluate(v=>{v.muted=true;v.play();});
  await expect.poll(()=>v.evaluate(v=>v.currentTime),{timeout:20000}).toBeGreaterThan(0.2);
  await expect.poll(()=>v.evaluate(v=>v.videoWidth)).toBe(1280);
  await v.evaluate(v=>v.pause());
});
test('mobile layout and native media', async ({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  expect(size.scroll).toBeLessThanOrEqual(size.width);
  await expect(page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Demos',exact:true})).toBeVisible();
  for (const image of await page.locator('main img[loading="lazy"]').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(()=>image.evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
  }
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:'test-results/mobile.png',fullPage:true});
  await page.screenshot({path:'test-results/mobile-top.png'});
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Demos',exact:true}).click();
  const v=page.locator('#bolt-live-demo');await v.scrollIntoViewIfNeeded();
  await expect(v.locator('source')).toHaveAttribute('src',/\.mp4$/);
  await v.evaluate(v=>{v.muted=true;v.play();});
  await expect.poll(()=>v.evaluate(v=>v.currentTime),{timeout:20000}).toBeGreaterThan(0.2);
  await v.evaluate(v=>v.pause());
});
test('main navigation follows page order without nested or duplicate entries',async({page})=>{
  await page.goto('/');
  const nav=page.getByRole('navigation',{name:'Main navigation'});
  await expect(page.locator('.site-header')).toHaveCSS('background-color','rgb(255, 255, 255)');
  await expect(nav.getByRole('link')).toHaveText(['Overview','Demos','Results','Method']);
  expect(await nav.getByRole('link').evaluateAll(links=>links.map(a=>a.getAttribute('href'))))
    .toEqual(['#video','#showcases','#comparisons','#method']);
  expect(await nav.evaluate(el=>{
    const targets=[...el.querySelectorAll('a')].map(a=>document.querySelector(a.getAttribute('href')));
    return targets.every((target,i)=>target?.parentElement.tagName==='MAIN' &&
      (i===0 || Boolean(targets[i-1].compareDocumentPosition(target)&Node.DOCUMENT_POSITION_FOLLOWING)));
  })).toBe(true);
  await expect(page.locator('.site-header a[href="#live-demo"], .site-header .series-link')).toHaveCount(0);
  await expect(page.locator('.site-footer').getByRole('link',{name:'YOPO series'})).toBeVisible();
  for(const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for(const link of await nav.getByRole('link').all()) {
      await expect(link).toBeInViewport();
      const bounds=await link.boundingBox();
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x+bounds.width).toBeLessThanOrEqual(width);
      await link.click();
      const target=await link.getAttribute('href');
      expect(new URL(page.url()).hash).toBe(target);
      await expect.poll(()=>page.locator(target).evaluate(el=>
        el.getBoundingClientRect().top-document.querySelector('.site-header').getBoundingClientRect().bottom))
        .toBeGreaterThanOrEqual(-1);
    }
    await page.locator('.site-header').screenshot({path:`test-results/navigation-${width}.png`});
  }
  await page.goto('http://127.0.0.1:4174/RYOPO-project-page/');
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Overview'}).click();
  await expect(page).toHaveURL('http://127.0.0.1:4174/RYOPO-project-page/#video');
});
test('private preview supports project subpath and byte ranges',async({page,request})=>{
  await page.goto('http://127.0.0.1:4174/RYOPO-project-page/');
  await page.getByRole('tab',{name:'CAMERA25',exact:true}).click();
  await expect(page.locator('#accuracy-table .ours')).toContainText('98.6');
  const range=await request.get('/assets/videos/hero-benchmark.mp4',{headers:{Range:'bytes=0-99'}});
  expect(range.status()).toBe(206);expect((await range.body()).length).toBe(100);
  expect((await request.get('/.git/config')).status()).toBe(404);
});
test('previews can be played and paused, with no small-screen overflow',async({page})=>{
  await page.goto('/');
  const preview=page.locator('.ambient-video').first();
  await preview.scrollIntoViewIfNeeded();
  await page.getByRole('button',{name:/Play previews/}).click();
  await expect.poll(()=>preview.evaluate(v=>v.currentTime),{timeout:20000}).toBeGreaterThan(0.2);
  await page.getByRole('button',{name:/Pause previews/}).click();
  await expect.poll(()=>preview.evaluate(v=>v.paused)).toBe(true);
  for(const width of [320,375,768,1024]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});
test('custom showcases play, distinguish instances, and credit the annotation tool',async({page})=>{
  await page.goto('/');
  await expect(page.locator('#showcases > .section-lead')).toHaveText('Both demos use a RealSense L515 RGB-D camera and mask-free RYOPO models trained separately on their respective datasets.');
  await expect(page.locator('#showcases > .section-lead strong')).toHaveText('mask-free RYOPO');
  const showcaseText=await page.locator('#showcases').textContent();
  expect(showcaseText.match(/RealSense L515/g)).toHaveLength(1);
  expect(showcaseText.match(/mask-free/gi)).toHaveLength(1);
  await expect(page.locator('#bolt-panel-live .demo-description p')).toHaveCount(0);
  await expect(page.locator('#bolt-panel-live .runtime-summary')).toContainText('RTX 4080 Super');
  await expect(page.locator('#usagi-scope, #showcases a[download]')).toHaveCount(0);
  await expect(page.locator('#usagi-demo')).not.toHaveAttribute('aria-describedby','usagi-scope');
  await expect(page.locator('#showcases')).toContainText('one physical plush toy');
  await expect(page.locator('.showcase-heading')).toContainText('12 videos of one physical plush toy');
  await expect(page.locator('#showcases')).not.toContainText('Usagi');
  await expect(page.locator('#showcases [aria-label*="Usagi"]')).toHaveCount(0);
  await expect(page.locator('#showcases')).toContainText('separate tracker');
  await expect(page.locator('#snappose')).toContainText('Public release planned');
  await expect(page.locator('#snappose figcaption')).toHaveText('Default example: NOCS REAL275, manually annotated with SnapPose.');
  await expect(page.locator('#snappose a')).toHaveAttribute('href','https://github.com/pitin-ev/snappose');
  for(const [id,tab] of [['usagi-training',null],['usagi-demo',null],['bolt-motion-demo','Fast camera motion'],['bolt-id-demo','ID tracking']]) {
    if (tab) await page.getByRole('tab',{name:new RegExp(tab)}).click();
    const video=page.locator(`#${id}`);
    await video.scrollIntoViewIfNeeded();
    await expect(video.locator('source')).toHaveAttribute('src',/\.mp4$/);
    await video.evaluate(v=>{v.muted=true;v.play();});
    await expect.poll(()=>video.evaluate(v=>v.currentTime),{timeout:20000}).toBeGreaterThan(.2);
    await video.evaluate(v=>v.pause());
  }
  const demo=page.locator('#usagi-demo');
  await page.getByRole('button',{name:/Unseen instance 2/}).click();
  await expect.poll(()=>demo.evaluate(v=>v.currentTime)).toBeGreaterThanOrEqual(34);
  await expect(page.locator('[data-usagi-seek="34"]')).toHaveAttribute('aria-current','true');
  await page.getByRole('button',{name:/Unseen instance 1/}).click();
  await expect.poll(()=>demo.evaluate(v=>v.currentTime)).toBeGreaterThanOrEqual(18);
  await expect.poll(()=>demo.evaluate(v=>v.currentTime)).toBeLessThan(22);
  await demo.evaluate(v=>v.pause());
  await page.getByRole('button',{name:'Enlarge the SnapPose annotation workspace'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect.poll(()=>page.locator('#dialog-image').evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
  await page.keyboard.press('Escape');
  await page.getByRole('tab',{name:'Object interaction',exact:true}).click();
  // Keep the screenshot free of focus rings/native-media tooltips from interaction checks.
  await page.evaluate(()=>{document.activeElement.blur();window.getSelection()?.removeAllRanges();});
  await page.evaluate(()=>document.activeElement.blur());
  await page.locator('#showcases').screenshot({path:'test-results/showcases-desktop.png',style:'.site-header{visibility:hidden}'});
  await page.setViewportSize({width:390,height:844});
  await page.locator('#showcases').screenshot({path:'test-results/showcases-mobile.png',style:'.site-header{visibility:hidden}'});
  for(const width of [320,375,768,1024]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});
test('Usagi players match and benchmark evidence stays together',async({page})=>{
  await page.goto('/');
  const training=await page.locator('#usagi-training').boundingBox();
  const live=await page.locator('#usagi-demo').boundingBox();
  expect(Math.abs(training.width-live.width)).toBeLessThan(1);
  expect(Math.abs(training.height-live.height)).toBeLessThan(1);
  expect(Math.abs(training.y-live.y)).toBeLessThan(1);
  expect(training.width/training.height).toBeCloseTo(16/9,2);
  await expect(page.locator('#usagi-demo source')).toHaveAttribute('data-src',/labeled\.mp4$/);
  expect(await page.locator('#comparisons').evaluate(e=>e.nextElementSibling.id)).toBe('accuracy');
  expect(await page.locator('#accuracy').evaluate(e=>e.nextElementSibling.id)).toBe('method');
  expect(await page.locator('#live-demo').evaluate(e=>e.nextElementSibling.id)).toBe('snappose');
  await page.evaluate(()=>window.scrollTo(0,document.querySelector('#showcases').getBoundingClientRect().top+scrollY-80));
  await page.screenshot({path:'test-results/usagi-desktop.png'});
});
test('bolt carousel supports arrows, keyboard, and pause-on-hide',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await page.locator('#live-demo').scrollIntoViewIfNeeded();
  await expect(page.locator('#bolt-motion-demo source')).not.toHaveAttribute('src');
  await expect(page.locator('#bolt-live-demo source')).toHaveAttribute('src',/\.mp4$/);
  await page.locator('#bolt-live-demo').evaluate(v=>{v.muted=true;v.play();});
  await expect.poll(()=>page.locator('#bolt-live-demo').evaluate(v=>v.currentTime)).toBeGreaterThan(.1);
  await page.getByRole('button',{name:'Next bolt demonstration'}).click();
  await expect(page.locator('#bolt-counter')).toHaveText('2 / 3');
  await expect(page.locator('#bolt-panel-live')).toBeHidden();
  expect(await page.locator('#bolt-live-demo').evaluate(v=>v.paused)).toBe(true);
  await expect(page.locator('#bolt-panel-motion')).toBeVisible();
  expect(await page.locator('#bolt-motion-demo').evaluate(v=>v.paused)).toBe(true);
  await expect(page.locator('#bolt-panel-motion')).toContainText('Live RGB-D inference during rapid camera motion');
  await page.getByRole('tab',{name:'Fast camera motion',exact:true}).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab',{name:/ID tracking/})).toBeFocused();
  await expect(page.locator('#bolt-counter')).toHaveText('3 / 3');
  await expect(page.locator('#bolt-panel-ids')).toContainText('not part of the paper');
  await page.locator('#bolt-panel-ids').screenshot({path:'test-results/bolt-ids.png'});
  await page.keyboard.press('Home');
  await expect(page.locator('#bolt-counter')).toHaveText('1 / 3');
  await page.getByRole('button',{name:'Previous bolt demonstration'}).click();
  await expect(page.locator('#bolt-counter')).toHaveText('3 / 3');
  await page.getByRole('tab',{name:'Object interaction',exact:true}).click();
  await expect(page.locator('#live-demo .runtime-summary')).toBeVisible();
  await expect(page.locator('#live-demo .symmetry-note')).toContainText('local Y axis');
  expect(errors).toEqual([]);
});
test('mobile swipe changes a demo without hijacking native video controls',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  const area=page.locator('#bolt-panel-live .demo-description');
  await area.dispatchEvent('pointerdown',{pointerType:'touch',pointerId:1,clientX:250,clientY:100});
  await area.dispatchEvent('pointerup',{pointerType:'touch',pointerId:1,clientX:100,clientY:105});
  await expect(page.locator('#bolt-counter')).toHaveText('2 / 3');
  const video=page.locator('#bolt-motion-demo');
  await video.dispatchEvent('pointerdown',{pointerType:'touch',pointerId:2,clientX:250,clientY:100});
  await video.dispatchEvent('pointerup',{pointerType:'touch',pointerId:2,clientX:100,clientY:105});
  await expect(page.locator('#bolt-counter')).toHaveText('2 / 3');
});
test('showcases also work under a GitHub project subpath',async({page})=>{
  await page.goto('http://127.0.0.1:4174/RYOPO-project-page/');
  await page.getByRole('button',{name:/Unseen instance 2/}).click();
  await expect.poll(()=>page.locator('#usagi-demo').evaluate(v=>v.currentTime),{timeout:20000}).toBeGreaterThanOrEqual(34);
  await page.locator('#usagi-demo').evaluate(v=>v.pause());
});
test('overview, simplified pipeline, direct benchmark player, and concise sections',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  expect(await page.locator('#video').evaluate(e=>e.nextElementSibling.id)).toBe('showcases');
  await expect(page.locator('.hero-media video').last().locator('source')).toHaveAttribute('data-src',/showcase-bolt-motion\.mp4$/);
  await expect(page.locator('.hero')).not.toContainText('Pose-output processing rates');
  await expect(page.locator('#comparison-download, #gallery-protocol')).toHaveCount(0);
  await expect(page.locator('#mask-free, #comparison-highlights')).toHaveCount(0);
  await expect(page.locator('#comparisons video')).toHaveCount(1);
  await expect(page.locator('#video video')).toHaveCount(1);
  await expect(page.locator('#video-title')).toHaveText('OVERVIEW');
  await expect(page.locator('#video p, .showcase-heading h3, .attribution, #metric-takeaway')).toHaveCount(0);
  await expect(page.locator('.release-section, #release-title, .contact-link')).toHaveCount(0);
  await expect(page.locator('main > section').last()).toHaveAttribute('id','citation');
  for (const text of ['The approach, in three minutes.', 'One training instance. Two unseen instances.', 'Visual foundation:', 'Set-prediction lineage:']) {
    await expect(page.locator('main')).not.toContainText(text);
  }
  await expect(page.locator('#comparisons')).not.toContainText('display threshold');
  await expect(page.locator('.symmetry-note')).toBeVisible();
  await expect(page.locator('.symmetry-note')).toContainText('local Y axis');
  await page.getByRole('button',{name:'Enlarge the simplified RYOPO pipeline',exact:true}).click();
  await expect.poll(()=>page.locator('#dialog-image').evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
  await page.keyboard.press('Escape');
  await page.evaluate(()=>document.activeElement.blur());
  await page.locator('.intro-section').screenshot({path:'test-results/intro-pipeline.png',style:'.site-header{visibility:hidden}'});
  await page.locator('#video').screenshot({path:'test-results/overview-desktop.png',style:'.site-header{visibility:hidden}'});
  const v=page.locator('#comparison-video');
  await v.scrollIntoViewIfNeeded();
  await expect(v.locator('source')).toHaveAttribute('src',/real275-scene_2\.mp4$/);
  await v.evaluate(async v=>{v.muted=true;await v.play();});
  await expect.poll(()=>v.evaluate(v=>v.currentTime),{timeout:20000}).toBeGreaterThan(.2);
  expect(await v.evaluate(v=>v.duration)).toBeCloseTo(487/20,1);
  await v.evaluate(v=>v.pause());
  await page.locator('#comparisons').screenshot({path:'test-results/comparisons-desktop.png',style:'.site-header{visibility:hidden}'});
  expect(errors).toEqual([]);
});
test('mask-free all-object values agree on every dataset and at project subpath',async({page})=>{
  await page.goto('http://127.0.0.1:4174/RYOPO-project-page/');
  for (const [dataset,values] of [
    ['REAL275',['91.9','36.7','48.5','71.9']],
    ['CAMERA25',['98.4','77.0','85.1','92.0']],
    ['HouseCat6D',['60.2','19.3','24.4','41.1']],
  ]) {
    await page.getByRole('tab',{name:dataset,exact:true}).click();
    await expect(page.locator('#accuracy-table .maskfree-row td')).toHaveText(values);
  }
  await expect(page.locator('#accuracy-table .maskfree-row strong')).toHaveText('24.4');
});
test('training preview preserves its duration and plays the face-down excerpt',async({page})=>{
  await page.goto('/');
  const v=page.locator('#usagi-training');
  await expect(v.locator('..').locator('figcaption')).toHaveText('Cropped training views · 5 FPS playback.');
  await expect(v).toHaveAttribute('aria-label','Training captures of the same plush toy from multiple viewpoints');
  await v.scrollIntoViewIfNeeded();
  await expect(v.locator('source')).toHaveAttribute('src',/usagi-training-headside\.mp4$/);
  await v.evaluate(async v=>{v.muted=true;await v.play();});
  await expect.poll(()=>v.evaluate(v=>v.duration)).toBe(18);
  await v.evaluate(v=>{v.pause();v.currentTime=14;});
  await expect.poll(()=>v.evaluate(v=>!v.seeking&&v.readyState>=2)).toBe(true);
  expect(await v.evaluate(v=>[v.videoWidth,v.videoHeight])).toEqual([960,540]);
  await page.locator('.usagi-grid').screenshot({path:'test-results/usagi-facedown.png',style:'.site-header{visibility:hidden}'});
});

test('provisional citation copies exactly and fits desktop and mobile', async ({page,context}) => {
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await page.goto('/#citation');
  await expect(page.locator('main > section').last()).toHaveAttribute('id','citation');
  await expect(page.locator('#citation-title')).toHaveText('Citation');
  await expect(page.locator('#citation-note')).toContainText('Provisional');
  const bibtex=(await page.locator('#bibtex').textContent()).trim();
  expect(bibtex).toContain('title         = {{RYOPO}: Bringing End-to-End Category-Level Object Pose Estimation into Real Time}');
  expect(bibtex).toContain('author        = {Hakjin Lee and Junghoon Seo and Jaehoon Sim}');
  expect(bibtex).toContain('eprint        = {ARXIV_ID_PENDING}');
  expect(bibtex).toContain('archivePrefix = {arXiv}');
  await page.getByRole('button',{name:'Copy BibTeX'}).click();
  await expect(page.locator('#citation-status')).toHaveText('BibTeX copied.');
  expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(bibtex);
  await expect(page.locator('#citation a[href*="arxiv.org"]')).toHaveCount(0);
  await page.locator('#citation').screenshot({path:'test-results/citation-desktop.png',style:'.site-header{visibility:hidden}'});
  for (const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(await page.locator('.citation-code').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
    if(width===390) await page.locator('#citation').screenshot({path:'test-results/citation-mobile.png',style:'.site-header{visibility:hidden}'});
  }
});

test('citation offers manual selection when clipboard access is blocked', async ({page}) => {
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw new Error('Clipboard denied');}}});
    document.execCommand=()=>false;
  });
  await page.goto('http://127.0.0.1:4174/RYOPO-project-page/#citation');
  await page.getByRole('button',{name:'Copy BibTeX'}).click();
  await expect(page.locator('#citation-status')).toHaveText('Copy unavailable. The BibTeX is selected for manual copying.');
  expect(await page.evaluate(()=>window.getSelection().toString())).toBe(await page.locator('#bibtex').textContent());
  await expect(page.getByRole('button',{name:'Copy BibTeX'})).toBeEnabled();
});

test('citation remains readable without JavaScript', async ({browser}) => {
  const context=await browser.newContext({javaScriptEnabled:false});
  try {
    const page=await context.newPage();
    await page.goto('http://127.0.0.1:4173/#citation');
    await expect(page.locator('#bibtex')).toContainText('ARXIV_ID_PENDING');
    await expect(page.locator('#copy-bibtex')).toBeHidden();
  } finally { await context.close(); }
});
