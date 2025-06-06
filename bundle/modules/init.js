var C=Object.defineProperty;var U=(u,e,t)=>e in u?C(u,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):u[e]=t;var y=(u,e)=>C(u,"name",{value:e,configurable:!0});var T=(u,e,t)=>(U(u,typeof e!="symbol"?e+"":e,t),t);var{TextEditor:j}=foundry.applications.ux,b=class{static async exportPack(e,t){let n=await e.getDocuments(),c=new JSZip,i=n.filter(a=>!a.folder),m={};await this.handleFolderDocs(i,t,c,e,m);for(let a of Array.from(e.folders).sort((l,d)=>l.sort??0-d.sort??0)){let l=n.filter(d=>d.folder===a);l.length!==0&&await this.handleFolderDocs(l,t,c,e,m)}let p=foundry.utils.expandObject(m),s=y((a,l=1,d=[])=>Object.entries(a).map(([f,w])=>{let P="#".repeat(l)+" "+f;if(Array.isArray(w)&&w.length===1){let L=d.length>0?d.map(x=>encodeURIComponent(x)).join("/")+"/"+encodeURIComponent(f):encodeURIComponent(f);return`- [${w[0]}](<./${L}/${w[0].replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g,"_")}.md>)`}else if(Array.isArray(w)){let L=d.length>0?d.map(x=>encodeURIComponent(x)).join("/")+"/"+encodeURIComponent(f):encodeURIComponent(f);return`${P}

${w.map(x=>`- [${x}](<./${L}/${x.replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g,"_")}.md>)`).join(`
`)}`}else return`${P}

${s(w,l+1,d.concat(f))}`}).join(`

`),"createTocMarkdown"),g=s(p);c.file("TOC.md",g);let h=e.metadata.label||e.metadata.name||e.metadata.id,r=await c.generateAsync({type:"blob"}),o=document.createElement("a");o.href=URL.createObjectURL(r),o.download=`${h}.zip`,o.click(),URL.revokeObjectURL(o.href)}static async handleFolderDocs(e,t,n,c,i){for(let m of e.sort((p,s)=>p.sort??0-s.sort??0)){let p=this.buildPath(m,c,[]),s=await this.convertJournalToMarkdown(m,t,c,p.length);p.push(m.name);let g=[];for(let h of s){let r=h.name.replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g,"_");if(g.push(h.name),n.folder(p.join("/")).file(`${r}.md`,h.markdown),h.imageUrls.length>0)for(let o of h.imageUrls){let a=await fetch(o);if(!a.ok)continue;let l=await a.blob(),d=o.split("/").pop();n.folder("asset").file(d,l)}}foundry.utils.setProperty(i,p.join("."),g)}}static buildPath(e,t,n){return e.folder?(n.unshift(e.folder.name),this.buildPath(e.folder,t,n)):n}static getImageUrlsAndRerout(e,t){return{pattern:/<img[^>]+src="([^"]+)"[^>]*>/g,enricher:async(c,i)=>{let m=c[1];if(m.startsWith("http")||m.startsWith("data:"))return c[0];i.urls.push(m);let p="./"+"../".repeat(i.pathLength+1)+"asset/"+m.split("/").pop();return console.log(m,p,c[0]),c[0].replace(m,p)}}}static getLinkEnricher(e,t){let n=["Compendium","UUID"];return{pattern:new RegExp(`@(${n.join("|")})\\[([^#\\]]+)(?:#([^\\]]+))?](?:{([^}]+)})?`,"g"),enricher:async(i,m)=>{let[p,s,g,h]=i.slice(1,5),r;if(p==="UUID")r=await foundry.utils.fromUuid(s);else if(p==="Compendium"){let{collection:o,id:a}=foundry.utils.parseUuid(`Compendium.${s}`)??{};a&&o&&(o.index.has(a)?r=await o.getDocument(a):r=await o.getName(a))}if(r&&r.pack==e.metadata.id){let a=b.buildPath(r,e,[]).map(P=>encodeURIComponent(P)),l=b.buildPath(t,e,[]),d=r.name;r.documentName=="JournalEntry"&&(a.push(encodeURIComponent(r.name)),d=Array.from(r.pages)[0].name);let f=l.length>1?"../".repeat(l.length+1):"",w=d.replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g,"_");return`<a href="./${f}${a.join("/")}/${w}.md">${h||r.name}</a>`}return i[0]}}}static async convertJournalToMarkdown(e,t,n,c){let i=foundry.applications.sheets.journal.JournalEntryPageTextSheet._converter,m=[];for(let p of e.pages){let s=foundry.utils.getProperty(p,"text.content"),g=[];if(!s)continue;if(t.removeLinks=="convertLinks"){let o=this.getLinkEnricher(n,e),a=s.matchAll(o.pattern);for(let l of a){let d=await o.enricher(l,{});s=s.replace(l[0],d)}}if(t.withImages){let o=this.getImageUrlsAndRerout(n,e),a=s.matchAll(o.pattern);for(let l of a){let d=await o.enricher(l,{urls:g,pathLength:c});s=s.replace(l[0],d)}}t.enrich&&(s=await j.enrichHTML(s)),t.removeLinks=="removeLinks"&&(s=s.replace(/<a[^>]*>(.*?)<\/a>/g,"$1"));let h=i.makeMarkdown(s);h=`[TOC](<./${"../".repeat(c+1)}TOC.md>)

`+h,m.push({markdown:h,name:p.name,imageUrls:g})}return m}};y(b,"ExportAsMarkdown");var{TextEditor:F}=foundry.applications.ux,v=class{static async exportPack(e,t,n){let c=(await e.getDocuments()).sort((r,o)=>r.sort??0-o.sort??0),i={none:[]};for(let r of Array.from(e.folders).sort((o,a)=>o.sort??0-a.sort??0))for(let o of c.filter(a=>a.folder===r)){let l=(await this.convertJournalToHTML(o,t)).map(f=>`
                        <h3>${f.name}</h3>
                        ${f.html}
                    <div class="page_break"></div>`).join(""),d=`
                    <h2>${o.name}</h2>
                    ${l}
                    <div class="page_break"></div>`;i[r.id]=i[r.id]||[],i[r.id].push(d)}for(let r of c.filter(o=>!o.folder)){let a=(await this.convertJournalToHTML(r,t)).map(d=>`
                        <h3>${d.name}</h3>
                        ${d.html}
                    <div class="page_break"></div>`).join(""),l=`
                    <h2>${r.name}</h2>
                    ${a}
                    <div class="page_break"></div>`;i.none.push(l)}let m=Object.entries(i).map(([r,o])=>{let a=e.folders.get(r);return`<div class="folder">
                <h1>${a?a.name:""}</h1>
                ${o.join("")}
            </div>`}).join(""),p=e.metadata.label||e.metadata.name||e.metadata.id;window.HTML3PDFprogressCallback=n;let s=window.open("","_blank","width=800,height=600"),h=`
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
                        ${t.foundryStyles?Array.from(document.styleSheets).map(r=>{try{return Array.from(r.cssRules).filter(o=>!(o instanceof CSSStyleRule)||!o.selectorText.includes("body")).map(o=>o.cssText).join(`
`)}catch{return""}}).join(`
`):""}
            </style>
        </head>
        <body>
            <div id="pdf-content">
                ${m}
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
                        filename: "${p}.pdf",
                        margin: 1,
                        pagebreak: { mode: ['avoid-all', 'css', 'legacy'], elementType: 'div', className: 'page_break' },
                        html2canvas: { scale: 2 },
                        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
                    }).from(el).save().listen(window.opener.HTML3PDFprogressCallback).then(() => window.close());
                }
            <\/script>
        </body>
    </html>
`;for(s.document.open(),s.document.write(h),s.document.close();!s.closed;)console.log("Waiting for the window to close..."),await new Promise(r=>setTimeout(r,1e3));window.HTML3PDFprogressCallback=null}static buildPath(e,t,n){return e.folder?(n.unshift(e.folder.name),this.buildPath(e.folder,t,n)):n}static async convertJournalToHTML(e,t){let n=[];for(let c of e.pages){let i=foundry.utils.getProperty(c,"text.content");!i||(t.enrich&&(i=await F.enrichHTML(i)),t.removeLinks.value=="removeLinks"&&(i=i.replace(/<a[^>]*>(.*?)<\/a>/g,"$1")),n.push({html:i,name:c.name}))}return n}};y(v,"ExportAsPDF");Hooks.on("getCompendiumContextOptions",(u,e)=>{if(!game.user.isGM)return!1;let t=y(n=>{let c=n.dataset.pack;return game.packs.get(c)?.documentName=="JournalEntry"},"condition");e.push({name:"exportJournals.exportMarkdown",icon:'<i class="fas fa-markdown"></i>',condition:t,callback:n=>D(n)})});async function D(u){let e=u.dataset.pack,t=game.packs.get(e);new k(t).render(!0)}y(D,"exportCompendium");var $=class extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2){constructor(e){super(),this.pack=e,this.history=[]}get title(){return this.pack.metadata.label||this.pack.metadata.name||this.pack.metadata.id}static exportMarkdown(e,t){let n=new foundry.applications.ux.FormDataExtended(this.element.querySelector("form")).object;b.exportPack(this.pack,n),this.close()}updateProgress(e){this.progress.update({message:"exportJournals.exportPDF",localize:!0,pct:e.val/e.n})}receiveLogFromChild(e){this.history.push(e),this.history=this.history.slice(-3);let t=this.element.querySelector(".progress");t.classList.remove("hidden"),t.textContent=this.history.join(`
`)}static async exportPDF(e,t){window.receiveLogFromChild=this.receiveLogFromChild.bind(this),this.progress=ui.notifications.info("exportJournals.exportPDF",{progress:!0,localize:!0});let n=new foundry.applications.ux.FormDataExtended(this.element.querySelector("form")).object;await v.exportPack(this.pack,n),window.receiveLogFromChild=null,this.progress.update({message:"exportJournals.exportPDF",localize:!0,progress:1}),this.close()}},k=$;y(k,"Exporter"),T(k,"PARTS",{main:{template:"modules/exportjournals/templates/exporter.hbs",root:!0}}),T(k,"DEFAULT_OPTIONS",{actions:{exportMarkdown:$.exportMarkdown,exportPDF:$.exportPDF},position:{width:500},window:{contentClasses:["standard-form"]}});
