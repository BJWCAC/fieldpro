(function(){
  var c=document.createElement('canvas');c.width=480;c.height=320;var g=c.getContext('2d');
  g.fillStyle='#111827';g.fillRect(0,0,480,320);
  g.fillStyle='#00c0a0';g.font='bold 26px sans-serif';g.fillText('CHART RECORDER',24,70);
  g.fillStyle='#e5e7eb';g.font='18px sans-serif';
  g.fillText('Panel LCP-3 / Loop FIT-101',24,120);
  g.fillText('Nameplate photo (test fixture)',24,155);
  var img=c.toDataURL('image/jpeg',0.85);
  var report=[
    '## SUMMARY OF WORK',
    'Annual calibration of the circular chart recorder at the Rogers WWTP influent flume on Wednesday, August 19, 2026. Work order 44821 on job CAC-4641.',
    '',
    '## EQUIPMENT SERVICED',
    '- Chart recorder, Honeywell DR4500A, Serial: 6M-4471, panel LCP-3',
    '- Backup recorder: Partlow MRC 7000 (Serial number 88-2214)',
    '- Chart paper part number 24001660-001 restocked, 12 rolls on hand',
    '- Loop FIT-101, 0-1500 GPM, 4-20 mA output, 24 VDC loop power',
    '',
    '## FINDINGS',
    'The DR4500A pen drive was binding at mid-span. Pen arm P/N 51404671-501 was replaced from van stock.',
    'As-found error 1.8% of span at 50%; as-left 0.2%. Chart speed verified at 1 in/hr.',
    'Loop verified at 4.00 mA (0 GPM), 12.01 mA (750 GPM), 19.98 mA (1500 GPM). Ambient 72 F, 45% RH.',
    'Enclosure is NEMA Type 4X, IP65, wired with 18 AWG in 3/4in conduit, SS316 fittings.',
    'Calibrated with a Fluke 754 documenting calibrator, cal due 2027-02-14, per ISO 17025.',
    '',
    '## RECOMMENDATIONS',
    '- Replace the MRC 7000 within 12 months; quoted 1,850 for a like-for-like swap.',
    '- Stock two spare pen assemblies, Model 90 pen kit, order code R11CA111AA3A.',
    '',
    '## KEY POINTS SUMMARY',
    '- Chart recorder calibrated to 0.2% of span, within the 1.0% tolerance',
    '- Pen arm replaced; total onsite time 2 hr 30 min',
    '- Purchase order 7781 referenced for the pen kit'
  ].join('\n');
  var rec={
    id:'r4641test2',
    date:new Date().toISOString(),
    account:'Rogers WWTP',
    deal:'CAC-4641 DR4500A chart recorder calibration',
    stage:'Service Scheduled',
    technician:'Field Tech',
    report:report,
    copyType:'customer',
    copyLabel:'Customer Copy',
    photos:1,
    photoData:[{
      id:'p4641',
      display:img,
      label:'Nameplate',
      time:'10:42:15 AM',
      w:480,h:320,
      desc:'Recorder nameplate — Model: Honeywell DR4500A, Serial: 6M-4471',
      aiDesc:'Circular chart recorder with pen arm P/N 51404671-501 visible; chart speed 1 in/hr.',
      synthesis:'- Backup unit is a Partlow MRC 7000 in panel LCP-3\n- Loop FIT-101 verified at 4-20 mA over 0-1500 GPM'
    }],
    videos:[],hasVideo:false,sections:{},voiceNotes:'',
    locationData:{lat:45.188900,lng:-93.552200,address:'13400 Main St NW, Rogers, MN 55374'}
  };
  localStorage.setItem('fp_history',JSON.stringify([rec]));
  localStorage.setItem('fp_technician','Field Tech');
  localStorage.setItem('fp_report_copy',JSON.stringify({type:'customer',custom:''}));
  location.reload();
})();
