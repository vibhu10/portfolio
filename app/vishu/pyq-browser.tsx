'use client';

import {useEffect,useState} from 'react';
import s from './vishu.module.css';
import {loadPyqQuestions,type PyqBrowseQuestion} from './cloud-sync';

const years=[2025,2024,2023,2022] as const;

export default function PyqBrowser(){
  const[year,setYear]=useState<number>(2025);
  const[kind,setKind]=useState<'GS'|'GSAT'>('GS');
  const[rows,setRows]=useState<PyqBrowseQuestion[]>([]);
  const[index,setIndex]=useState(0);
  const[loading,setLoading]=useState(true);

  useEffect(()=>{
    if(year===2022&&kind==='GSAT'){
      setKind('GS');
      return;
    }
    let live=true;
    setLoading(true);
    setIndex(0);
    loadPyqQuestions(year,kind).then(data=>{
      if(!live)return;
      setRows(data);
      setLoading(false);
    });
    return()=>{live=false};
  },[year,kind]);

  const current=rows[index]||null;
  const ocrCount=rows.filter(q=>q.status==='ocr_unverified').length;
  const scanCount=rows.length-ocrCount;
  const sourceHref=current?.sourceUrl
    ? current.sourceUrl+(current.page?'#page='+current.page:'')
    : '';

  return <section className={s.pyqBank}>
    <div className={s.pyqHeader}>
      <div>
        <span className={s.kicker}>QUESTION-BY-QUESTION PYQ BANK</span>
        <h2>Browse all 700 imported PYQs.</h2>
        <p>Every question number is indexed. OCR text is shown only where the scan was readable enough; otherwise the original paper stays one click away.</p>
      </div>
      <div className={s.pyqStats}>
        <span><b>{rows.length||100}</b> questions</span>
        <span><b>{ocrCount}</b> OCR text</span>
        <span><b>{scanCount||Math.max(0,100-ocrCount)}</b> scan-linked</span>
      </div>
    </div>

    <div className={s.pyqFilters}>
      <div className={s.pyqFilterGroup}>
        <small>YEAR</small>
        <div>{years.map(y=><button key={y} className={year===y?s.pyqFilterActive:''} onClick={()=>setYear(y)}>{y}</button>)}</div>
      </div>
      <div className={s.pyqFilterGroup}>
        <small>PAPER</small>
        <div>
          <button className={kind==='GS'?s.pyqFilterActive:''} onClick={()=>setKind('GS')}>GS · Paper I</button>
          {year!==2022&&<button className={kind==='GSAT'?s.pyqFilterActive:''} onClick={()=>setKind('GSAT')}>Aptitude · Paper II</button>}
        </div>
      </div>
    </div>

    {loading?<div className={s.pyqLoading}><i/>Loading {year} {kind} questions…</div>:
    rows.length===0?<div className={s.pyqEmpty}>No indexed questions found for this paper.</div>:
    <div className={s.pyqLayout}>
      <aside className={s.pyqNavigator}>
        <div className={s.pyqNavHead}><span>QUESTION MAP</span><b>{index+1}/100</b></div>
        <div className={s.pyqGrid}>
          {rows.map((q,i)=><button
            key={q.id}
            title={q.status==='ocr_unverified'?'OCR transcription available':'Open original scan'}
            className={[
              s.pyqNavBtn,
              i===index?s.pyqNavActive:'',
              q.status==='ocr_unverified'?s.pyqNavOcr:s.pyqNavScan
            ].filter(Boolean).join(' ')}
            onClick={()=>setIndex(i)}
          >{q.number}</button>)}
        </div>
        <div className={s.pyqLegend}>
          <span><i className={s.pyqLegendOcr}/>OCR text</span>
          <span><i className={s.pyqLegendScan}/>Scan linked</span>
        </div>
      </aside>

      {current&&<article className={s.pyqQuestion}>
        <div className={s.pyqMeta}>
          <div>
            <small>HPAS {current.year} · {current.kind==='GS'?'GENERAL STUDIES · PAPER I':'APTITUDE TEST · PAPER II'}</small>
            <h3>Question {current.number}</h3>
          </div>
          <span className={current.status==='ocr_unverified'?s.pyqOcr:s.pyqScan}>
            {current.status==='ocr_unverified'?'OCR · UNVERIFIED':'SCAN ONLY'}
          </span>
        </div>

        <div className={s.pyqBody}>
          {current.status==='ocr_unverified'
            ? <p>{current.text}</p>
            : <div className={s.pyqScanMessage}>
                <b>Original question indexed.</b>
                <p>The scan was not clean enough to reproduce the wording safely. Use the source button below to read this question directly from the paper.</p>
              </div>}
        </div>

        <div className={s.pyqNotice}>
          <b>No guessed answers.</b>
          <span>This PYQ is not graded until its answer key is verified. Handwritten/circled marks in scans are not treated as official answers.</span>
        </div>

        <div className={s.pyqActions}>
          <button disabled={index===0} onClick={()=>setIndex(i=>Math.max(0,i-1))}>← Previous</button>
          {sourceHref&&<a className={s.pyqSource} href={sourceHref} target="_blank" rel="noreferrer">Open source paper {current.page?'· p. '+current.page:''} ↗</a>}
          <button disabled={index===rows.length-1} onClick={()=>setIndex(i=>Math.min(rows.length-1,i+1))}>Next →</button>
        </div>
      </article>}
    </div>}
  </section>;
}
