var P=Object.defineProperty;var T=(r,e,t)=>e in r?P(r,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):r[e]=t;var p=(r,e)=>P(r,"name",{value:e,configurable:!0});var k=(r,e,t)=>(T(r,typeof e!="symbol"?e+"":e,t),t);var{TextEditor:L}=foundry.applications.ux,h=class{static async exportPack(e,t){let o=await e.getDocuments(),i=new JSZip;for(let d of o){let v=await this.convertJournalToMarkdown(d,t),g=this.buildPath(d,e,[]);g.push(d.name);for(let a of v){let s=a.name.replace(/[^a-zA-Z0-9-_]/g,"_");i.folder(g.join("/")).file(`${s}.md`,a.markdown)}}let n=e.metadata.label||e.metadata.name||e.metadata.id,l=await i.generateAsync({type:"blob"}),c=document.createElement("a");c.href=URL.createObjectURL(l),c.download=`${n}.zip`,c.click(),URL.revokeObjectURL(c.href)}static buildPath(e,t,o){return e.folder?(o.unshift(e.folder.name),this.buildPath(e.folder,t,o)):o}static async convertJournalToMarkdown(e,t){let o=foundry.applications.sheets.journal.JournalEntryPageTextSheet._converter,i=[];for(let n of e.pages){let l=foundry.utils.getProperty(n,"text.content");if(!l)continue;t.enrich&&(l=await L.enrichHTML(l)),t.removeLinks&&(l=l.replace(/<a[^>]*>(.*?)<\/a>/g,"$1"));let c=o.makeMarkdown(l);i.push({markdown:c,name:n.name})}return i}};p(h,"ExportAsMarkdown");var{TextEditor:j}=foundry.applications.ux,f=class{static async exportPack(e,t,o){let i=await e.getDocuments(),n={none:[]};for(let a of e.folders)for(let s of i.filter(m=>m.folder===a.id)){let w=(await this.convertJournalToHTML(s,t)).map(x=>`
                        <h3>${x.name}</h3>
                        ${x.html}
                    <div class="page_break"></div>`).join(""),y=`
                    <h2>${s.name}</h2>
                    ${w}
                    <div class="page_break"></div>`;n[a.id]=n[a.id]||[],n[a.id].push(y)}for(let a of i.filter(s=>!s.folder)){let m=(await this.convertJournalToHTML(a,t)).map(y=>`
                        <h3>${y.name}</h3>
                        ${y.html}
                    <div class="page_break"></div>`).join(""),w=`
                    <h2>${a.name}</h2>
                    ${m}
                    <div class="page_break"></div>`;n.none.push(w)}let l=Object.entries(n).map(([a,s])=>{let m=e.folders.get(a);return`<div class="folder">
                <h1>${m?m.name:""}</h1>
                ${s.join("")}
            </div>`}).join(""),c=e.metadata.label||e.metadata.name||e.metadata.id;window.HTML3PDFprogressCallback=o;let d=window.open("","_blank","width=800,height=600"),g=`
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
                        ${t.foundryStyles?Array.from(document.styleSheets).map(a=>{try{return Array.from(a.cssRules).filter(s=>!(s instanceof CSSStyleRule)||!s.selectorText.includes("body")).map(s=>s.cssText).join(`
`)}catch{return""}}).join(`
`):""}
            </style>
        </head>
        <body>
            <div id="pdf-content">
                ${l}
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
                        filename: "${c}.pdf",
                        margin: 1,
                        pagebreak: { mode: ['avoid-all', 'css', 'legacy'], elementType: 'div', className: 'page_break' },
                        html2canvas: { scale: 2 },
                        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
                    }).from(el).save().listen(window.opener.HTML3PDFprogressCallback).then(() => window.close());
                }
            <\/script>
        </body>
    </html>
`;for(d.document.open(),d.document.write(g),d.document.close();!d.closed;)console.log("Waiting for the window to close..."),await new Promise(a=>setTimeout(a,1e3));window.HTML3PDFprogressCallback=null}static buildPath(e,t,o){return e.folder?(o.unshift(e.folder.name),this.buildPath(e.folder,t,o)):o}static async convertJournalToHTML(e,t){let o=[];for(let i of e.pages){let n=foundry.utils.getProperty(i,"text.content");!n||(t.enrich&&(n=await j.enrichHTML(n)),t.removeLinks&&(n=n.replace(/<a[^>]*>(.*?)<\/a>/g,"$1")),o.push({html:n,name:i.name}))}return o}};p(f,"ExportAsPDF");Hooks.on("getCompendiumContextOptions",(r,e)=>{if(!game.user.isGM)return!1;let t=p(o=>{let i=o.dataset.pack;return game.packs.get(i)?.documentName=="JournalEntry"},"condition");e.push({name:"exportJournals.exportMarkdown",icon:'<i class="fas fa-markdown"></i>',condition:t,callback:o=>F(o)})});async function F(r){let e=r.dataset.pack,t=game.packs.get(e);new u(t).render(!0)}p(F,"exportCompendium");var b=class extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2){constructor(e){super(),this.pack=e,this.history=[]}get title(){return this.pack.metadata.label||this.pack.metadata.name||this.pack.metadata.id}static exportMarkdown(e,t){let o=new foundry.applications.ux.FormDataExtended(this.element.querySelector("form")).object;h.exportPack(this.pack,o),this.close()}updateProgress(e){this.progress.update({message:"exportJournals.exportPDF",localize:!0,pct:e.val/e.n})}receiveLogFromChild(e){this.history.push(e),this.history=this.history.slice(-3),this.element.querySelector(".progress").textContent=this.history.join(`
`)}static async exportPDF(e,t){window.receiveLogFromChild=this.receiveLogFromChild.bind(this),this.progress=ui.notifications.info("exportJournals.exportPDF",{progress:!0,localize:!0});let o=new foundry.applications.ux.FormDataExtended(this.element.querySelector("form")).object;await f.exportPack(this.pack,o,this.updateProgress.bind(this)),window.receiveLogFromChild=null,this.progress.update({message:"exportJournals.exportPDF",localize:!0,progress:1}),this.close()}},u=b;p(u,"Exporter"),k(u,"PARTS",{main:{template:"modules/exportjournals/templates/exporter.hbs",root:!0}}),k(u,"DEFAULT_OPTIONS",{actions:{exportMarkdown:b.exportMarkdown,exportPDF:b.exportPDF},position:{width:500},window:{contentClasses:["standard-form"]}});
