(() => {
  'use strict';
  let enabled = true;
  let familyId = null;
  let weekOffset = 0;
  let applying = false;
  const sameDays = new Set();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const monday = () => {
    const d = new Date(); d.setHours(12,0,0,0);
    d.setDate(d.getDate() - ((d.getDay()+6)%7) + weekOffset*7);
    return d.toLocaleDateString('en-CA');
  };

  function addStyles(){
    if(document.getElementById('nv-siena-dinner-style')) return;
    const s=document.createElement('style'); s.id='nv-siena-dinner-style';
    s.textContent=`
      .meal-choice.nv-pressed,.meal-choice-popup [data-value].nv-pressed{background:#d85f84!important;color:#fff!important;border-color:#c94f75!important;box-shadow:0 0 0 3px rgba(216,95,132,.22)!important;transform:scale(.96)}
      .meal-choice,.meal-choice-popup [data-value]{transition:transform .13s ease,background .13s ease,color .13s ease,box-shadow .13s ease}
      .nv-same-dinner{display:flex!important;align-items:center;gap:8px;margin:9px 0 3px;padding:8px 9px;border:1px solid #ecc7d2;border-radius:10px;background:#fff7f9;color:#633848;font-size:12px;font-weight:700}
      .nv-same-dinner input{width:18px;height:18px;accent-color:#d85f84}
      .nv-setting-card{margin:18px 0;padding:14px;border:1px solid #ecd6dc;border-radius:16px;background:#fff}
      .nv-setting-card h2{margin:0 0 10px!important}
      .nv-setting-switch{display:flex;align-items:center;justify-content:space-between;gap:14px}
      .nv-setting-switch span{display:block;font-weight:800;color:#49373d}
      .nv-setting-switch small{display:block;margin-top:4px;color:#806d73;line-height:1.35}
      .nv-setting-switch input{width:22px;height:22px;flex:0 0 22px;accent-color:#d85f84}
      .nv-setting-status{min-height:16px;margin:8px 0 0;color:#a34664;font-size:12px}
      .day-list-actions,#quickEventForm .day-popup-actions{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;align-items:stretch!important;gap:10px!important;width:100%!important}
      .day-list-actions>button,#quickEventForm .day-popup-actions>button{appearance:none!important;display:flex!important;align-items:center!important;justify-content:center!important;box-sizing:border-box!important;width:100%!important;min-width:0!important;height:46px!important;min-height:46px!important;margin:0!important;padding:0 8px!important;border:0!important;border-radius:12px!important;box-shadow:none!important;font-size:14px!important;font-weight:700!important;line-height:1!important;text-align:center!important;white-space:nowrap!important}
      #closeDayEvents,#cancelDayPopup{background:#f1f1f2!important;color:#2f2529!important}
      #newEventThisDay,#quickEventForm .day-popup-actions>button:last-child{background:#e11d48!important;color:#fff!important}
    `;
    document.head.appendChild(s);
  }

  async function getContext(){
    if(typeof sb==='undefined'||typeof session==='undefined'||!session) return false;
    familyId = (typeof profile!=='undefined' && profile?.family_id) || null;
    if(!familyId){ const r=await sb.from('profiles').select('family_id').eq('id',session.user.id).maybeSingle(); familyId=r.data?.family_id; }
    return !!familyId;
  }

  async function loadSetting(){
    if(!await getContext()) return;
    const r=await sb.from('family_settings').select('siena_dinner_option').eq('family_id',familyId).maybeSingle();
    if(!r.error && r.data) enabled = r.data.siena_dinner_option !== false;
  }

  async function saveSetting(value){
    const r=await sb.from('family_settings').upsert({family_id:familyId,siena_dinner_option:value,updated_by:session.user.id,updated_at:new Date().toISOString()},{onConflict:'family_id'});
    if(r.error) throw r.error;
  }

  async function loadSameDays(){
    sameDays.clear(); if(!familyId) return;
    const r=await sb.from('menu_week_plans').select('day_index,siena_same_as_family').eq('family_id',familyId).eq('week_start',monday());
    if(!r.error) (r.data||[]).forEach(x=>{if(x.siena_same_as_family) sameDays.add(+x.day_index)});
  }

  async function syncDinner(day, same=true){
    const q=await sb.from('menu_week_plans').select('*').eq('family_id',familyId).eq('week_start',monday()).eq('day_index',day).maybeSingle();
    if(q.error) throw q.error;
    const row=q.data||{family_id:familyId,week_start:monday(),day_index:day,updated_by:session.user.id};
    row.siena_same_as_family=same;
    if(same) row.siena_item_id=row.dinner_item_id||null;
    row.updated_at=new Date().toISOString();
    const r=await sb.from('menu_week_plans').upsert(row,{onConflict:'family_id,week_start,day_index'});
    if(r.error) throw r.error;
  }

  function flash(el){
    if(!el) return; el.classList.add('nv-pressed');
    setTimeout(()=>el.classList.remove('nv-pressed'),420);
  }

  function dinnerBlocks(){ return [...document.querySelectorAll('.meal-block.dinner')]; }

  async function enhanceMenu(){
    if(applying || !document.querySelector('.menu-page')) return;
    applying=true;
    await getContext(); await loadSameDays();
    dinnerBlocks().forEach((block,day)=>{
      const labels=[...block.querySelectorAll(':scope > label')];
      const main=labels.find(x=>x.querySelector('[data-slot="dinner_item_id"]'));
      const siena=labels.find(x=>x.querySelector('[data-slot="siena_item_id"]'));
      if(!main||!siena) return;
      const mainText=[...main.childNodes].find(n=>n.nodeType===3);
      if(!enabled){
        if(mainText) mainText.textContent='Cena';
        siena.style.display='none';
        block.querySelector('.nv-same-dinner')?.remove();
      }else{
        if(mainText) mainText.textContent='Nosotros';
        siena.style.display='';
        let toggle=block.querySelector('.nv-same-dinner');
        if(!toggle){
          toggle=document.createElement('label'); toggle.className='nv-same-dinner';
          toggle.innerHTML='<input type="checkbox"> Siena cena lo mismo';
          main.after(toggle);
          toggle.querySelector('input').addEventListener('change',async e=>{
            const checked=e.target.checked; e.target.disabled=true; flash(toggle);
            try{ await syncDinner(day,checked); checked?sameDays.add(day):sameDays.delete(day); if(checked){const a=main.querySelector('.meal-choice'),b=siena.querySelector('.meal-choice'); if(a&&b)b.textContent=a.textContent;} }
            catch(err){e.target.checked=!checked; if(typeof nvAlert==='function')nvAlert('No se ha podido guardar la opción de cena de Siena.');}
            e.target.disabled=false;
          });
        }
        toggle.querySelector('input').checked=sameDays.has(day);
        siena.style.display=sameDays.has(day)?'none':'';
      }
    });
    applying=false;
  }

  function enhanceUser(){
    if(!document.querySelector('#profileForm')||document.querySelector('#nvSienaDinnerSetting')) return;
    const box=document.createElement('section'); box.id='nvSienaDinnerSetting'; box.className='nv-setting-card';
    box.innerHTML=`<h2>Configuración del menú</h2><label class="nv-setting-switch"><div><span>Opción Cena Siena</span><small>Activada: permite elegir una cena distinta para Siena o marcar que cena lo mismo. Desactivada: se muestra una única Cena.</small></div><input type="checkbox" ${enabled?'checked':''}></label><p class="nv-setting-status"></p>`;
    document.querySelector('#profileForm').after(box);
    box.querySelector('input').addEventListener('change',async e=>{
      const old=enabled; enabled=e.target.checked; e.target.disabled=true;
      const status=box.querySelector('.nv-setting-status'); status.textContent='Guardando…';
      try{await saveSetting(enabled);status.textContent='Preferencia guardada.';}
      catch(err){enabled=old;e.target.checked=old;status.textContent='No se ha podido guardar.';}
      e.target.disabled=false; setTimeout(()=>status.textContent='',1500);
    });
  }

  document.addEventListener('pointerdown',e=>{
    const choice=e.target.closest('.meal-choice,.meal-choice-popup [data-value]');
    if(choice) flash(choice);
  },true);

  document.addEventListener('click',async e=>{
    if(e.target.closest('#prevWeek')){weekOffset--; await sleep(80); enhanceMenu();}
    if(e.target.closest('#nextWeek')){weekOffset++; await sleep(80); enhanceMenu();}
    const option=e.target.closest('.meal-choice-popup [data-value]');
    if(option){
      const popup=document.querySelector('#mealChoicePopup');
      const openerSlot=popup?.dataset?.openerSlot;
      await sleep(180);
      const mainButtons=[...document.querySelectorAll('[data-slot="dinner_item_id"]')];
      const selected=mainButtons.find(b=>b.classList.contains('nv-last-opener'));
      const day=selected?+selected.dataset.day:null;
      if(day!==null && (!enabled||sameDays.has(day))){try{await syncDinner(day,true);}catch(_){}}
      document.querySelectorAll('.nv-last-opener').forEach(x=>x.classList.remove('nv-last-opener'));
    }
    const main=e.target.closest('[data-slot="dinner_item_id"]');
    if(main) main.classList.add('nv-last-opener');
  },true);

  const obs=new MutationObserver(()=>{
    addStyles();
    if(document.querySelector('.menu-page')) enhanceMenu();
    if(document.querySelector('#profileForm')) enhanceUser();
  });

  (async()=>{addStyles();await loadSetting();obs.observe(document.documentElement,{childList:true,subtree:true});enhanceMenu();enhanceUser();})();
})();
