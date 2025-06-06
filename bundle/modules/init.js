var D=Object.defineProperty;var U=(p,e,t)=>e in p?D(p,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):p[e]=t;var w=(p,e)=>D(p,"name",{value:e,configurable:!0});var j=(p,e,t)=>(U(p,typeof e!="symbol"?e+"":e,t),t);var M=(p,e,t)=>{if(e.has(p))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(p):e.set(p,t)};var{TextEditor:_}=foundry.applications.ux,C,A,T=class{static async exportPack(e,t){let n=await e.getDocuments(),c=new JSZip,i=n.filter(r=>!r.folder),h={};await this.handleFolderDocs(i,t,c,e,h);for(let r of Array.from(e.folders).sort((l,d)=>l.sort??0-d.sort??0)){let l=n.filter(d=>d.folder===r);l.length!==0&&await this.handleFolderDocs(l,t,c,e,h)}let m=foundry.utils.expandObject(h),s=w((r,l=1,d=[])=>Object.entries(r).map(([u,y])=>{let v="#".repeat(l)+" "+u;if(Array.isArray(y)&&y.length===1){let $=d.length>0?d.join("/")+"/"+u:u,L=encodeURIComponent($);return`- [${y[0]}](<./${L}/${y[0].replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g,"_")}.md>)`}else if(Array.isArray(y)){let $=d.length>0?d.join("/")+"/"+u:u,L=encodeURIComponent($);return`${v}

${y.map(F=>`- [${F}](<./${L}/${F.replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g,"_")}.md>)`).join(`
`)}`}else return`${v}

${s(y,l+1,d.concat(u))}`}).join(`

`),"createTocMarkdown"),f=s(m);c.file("TOC.md",f);let g=e.metadata.label||e.metadata.name||e.metadata.id,o=await c.generateAsync({type:"blob"}),a=document.createElement("a");a.href=URL.createObjectURL(o),a.download=`${g}.zip`,a.click(),URL.revokeObjectURL(a.href)}static async handleFolderDocs(e,t,n,c,i){for(let h of e.sort((m,s)=>m.sort??0-s.sort??0)){let m=this.buildPath(h,c,[]),s=await this.convertJournalToMarkdown(h,t,c,m.length);m.push(h.name);let f=[];for(let g of s){let o=g.name.replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g,"_");f.push(g.name),n.folder(m.join("/")).file(`${o}.md`,g.markdown)}foundry.utils.setProperty(i,m.join("."),f)}}static buildPath(e,t,n){return e.folder?(n.unshift(e.folder.name),this.buildPath(e.folder,t,n)):n}static getLinkEnricher(e,t){let n=["Compendium","UUID"];return{pattern:new RegExp(`@(${n.join("|")})\\[([^#\\]]+)(?:#([^\\]]+))?](?:{([^}]+)})?`,"g"),enricher:async(i,h)=>{let[m,s,f,g]=i.slice(1,5),o;if(m==="UUID")o=await foundry.utils.fromUuid(s);else if(m==="Compendium"){let{collection:a,id:r}=foundry.utils.parseUuid(`Compendium.${s}`)??{};r&&a&&(a.index.has(r)?o=await a.getDocument(r):o=await a.getName(r))}if(o&&o.pack==e.metadata.id){let r=T.buildPath(o,e,[]).map(v=>encodeURIComponent(v)),l=T.buildPath(t,e,[]),d=o.name;o.documentName=="JournalEntry"&&(r.push(encodeURIComponent(o.name)),d=Array.from(o.pages)[0].name);let u=l.length>1?"../".repeat(l.length+1):"",y=d.replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g,"_");return`<a href="./${u}${r.join("/")}/${y}.md">${g||o.name}</a>`}return i[0]}}}static async convertJournalToMarkdown(e,t,n,c){let i=foundry.applications.sheets.journal.JournalEntryPageTextSheet._converter,h=[];for(let m of e.pages){let s=foundry.utils.getProperty(m,"text.content");if(!s)continue;if(t.removeLinks=="convertLinks"){let o=this.getLinkEnricher(n,e),a=s.matchAll(o.pattern);for(let r of a){let l=await o.enricher(r,{});s=s.replace(r[0],l)}}t.enrich&&(s=await _.enrichHTML(s)),t.removeLinks=="removeLinks"&&(s=s.replace(/<a[^>]*>(.*?)<\/a>/g,"$1"));let f=i.makeMarkdown(s);f=`[TOC](<./${"../".repeat(c+1)}TOC.md>)

`+f,h.push({markdown:f,name:m.name})}return h}},k=T;w(k,"ExportAsMarkdown"),C=new WeakSet,A=w(function(e){let t=[],n=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);for(;n.nextNode();)t.push(n.currentNode);return t},"#getTextNodes"),M(k,C);var{TextEditor:S}=foundry.applications.ux,b=class{static async exportPack(e,t,n){let c=(await e.getDocuments()).sort((o,a)=>o.sort??0-a.sort??0),i={none:[]};for(let o of Array.from(e.folders).sort((a,r)=>a.sort??0-r.sort??0))for(let a of c.filter(r=>r.folder===o.id)){let l=(await this.convertJournalToHTML(a,t)).map(u=>`
                        <h3>${u.name}</h3>
                        ${u.html}
                    <div class="page_break"></div>`).join(""),d=`
                    <h2>${a.name}</h2>
                    ${l}
                    <div class="page_break"></div>`;i[o.id]=i[o.id]||[],i[o.id].push(d)}for(let o of c.filter(a=>!a.folder)){let r=(await this.convertJournalToHTML(o,t)).map(d=>`
                        <h3>${d.name}</h3>
                        ${d.html}
                    <div class="page_break"></div>`).join(""),l=`
                    <h2>${o.name}</h2>
                    ${r}
                    <div class="page_break"></div>`;i.none.push(l)}let h=Object.entries(i).map(([o,a])=>{let r=e.folders.get(o);return`<div class="folder">
                <h1>${r?r.name:""}</h1>
                ${a.join("")}
            </div>`}).join(""),m=e.metadata.label||e.metadata.name||e.metadata.id;window.HTML3PDFprogressCallback=n;let s=window.open("","_blank","width=800,height=600"),g=`
    <html>
        <head>
            <title>Generating PDF</title>
            <script crossorigin="anonymous" referrerpolicy="no-referrer" src="https://cdn.jsdelivr.net/npm/html3pdf@0.12.2/dist/html3pdf.bundle.min.js"><\/script>
            
            <style>
                    body { 
                    font-family: sans-serif; padding: 30px; max-width: 800px;                     
                    }
                    img {
                        max-width: 100% !important;
                    }
                    #pdf-content {
                        width: 100%;
                        max-width: 595px;
                        margin: 0 auto;
                    }
                    .page_break {
                        page-break-after: always;
                    }
                        ${t.foundryStyles?Array.from(document.styleSheets).map(o=>{try{return Array.from(o.cssRules).filter(a=>!(a instanceof CSSStyleRule)||!a.selectorText.includes("body")).map(a=>a.cssText).join(`
`)}catch{return""}}).join(`
`):""}
            </style>
        </head>
        <body>
            <div id="pdf-content">
                ${h}
            </div>
            <script>
            const originalLog = console.debug;
                console.debug = function(...args) {
                originalLog.apply(console, args); // still log locally
                if (window.opener && typeof window.opener.receiveLogFromChild === 'function') {
                    window.opener.receiveLogFromChild(args.join(' '));
                }
            };
                window.onload = async () => {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const el = document.getElementById("pdf-content");
                    html3pdf().set({
                        filename: "${m}.pdf",
                        margin: 1,
                        pagebreak: { mode: ['avoid-all', 'css', 'legacy'], elementType: 'div', className: 'page_break' },
                        html2canvas: { scale: 2 },
                        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
                    }).from(el).save().listen(window.opener.HTML3PDFprogressCallback).then(() => window.close());
                }
            <\/script>
        </body>
    </html>
`;for(s.document.open(),s.document.write(g),s.document.close();!s.closed;)console.log("Waiting for the window to close..."),await new Promise(o=>setTimeout(o,1e3));window.HTML3PDFprogressCallback=null}static buildPath(e,t,n){return e.folder?(n.unshift(e.folder.name),this.buildPath(e.folder,t,n)):n}static async convertJournalToHTML(e,t){let n=[];for(let c of e.pages){let i=foundry.utils.getProperty(c,"text.content");!i||(t.enrich&&(i=await S.enrichHTML(i)),t.removeLinks.value=="removeLinks"&&(i=i.replace(/<a[^>]*>(.*?)<\/a>/g,"$1")),n.push({html:i,name:c.name}))}return n}};w(b,"ExportAsPDF");Hooks.on("getCompendiumContextOptions",(p,e)=>{if(!game.user.isGM)return!1;let t=w(n=>{let c=n.dataset.pack;return game.packs.get(c)?.documentName=="JournalEntry"},"condition");e.push({name:"exportJournals.exportMarkdown",icon:'<i class="fas fa-markdown"></i>',condition:t,callback:n=>N(n)})});async function N(p){let e=p.dataset.pack,t=game.packs.get(e);new x(t).render(!0)}w(N,"exportCompendium");var P=class extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2){constructor(e){super(),this.pack=e,this.history=[]}get title(){return this.pack.metadata.label||this.pack.metadata.name||this.pack.metadata.id}static exportMarkdown(e,t){let n=new foundry.applications.ux.FormDataExtended(this.element.querySelector("form")).object;k.exportPack(this.pack,n),this.close()}updateProgress(e){this.progress.update({message:"exportJournals.exportPDF",localize:!0,pct:e.val/e.n})}receiveLogFromChild(e){this.history.push(e),this.history=this.history.slice(-3);let t=this.element.querySelector(".progress");t.classList.remove("hidden"),t.textContent=this.history.join(`
`)}static async exportPDF(e,t){window.receiveLogFromChild=this.receiveLogFromChild.bind(this),this.progress=ui.notifications.info("exportJournals.exportPDF",{progress:!0,localize:!0});let n=new foundry.applications.ux.FormDataExtended(this.element.querySelector("form")).object;await b.exportPack(this.pack,n,this.updateProgress.bind(this)),window.receiveLogFromChild=null,this.progress.update({message:"exportJournals.exportPDF",localize:!0,progress:1}),this.close()}},x=P;w(x,"Exporter"),j(x,"PARTS",{main:{template:"modules/exportjournals/templates/exporter.hbs",root:!0}}),j(x,"DEFAULT_OPTIONS",{actions:{exportMarkdown:P.exportMarkdown,exportPDF:P.exportPDF},position:{width:500},window:{contentClasses:["standard-form"]}});
