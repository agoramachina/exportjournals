const { TextEditor } = foundry.applications.ux;

export class ExportAsPDF {
    static async exportPack(pack, formData, callback) {
        const allDocs = (await pack.getDocuments()).sort((a, b) => a.sort ?? 0 - b.sort ?? 0);
        // Create a new PDF document
        const folders = { none: []}

        for (const folder of Array.from(pack.folders).sort((a, b) => a.sort ?? 0 - b.sort ?? 0)) {
            for (let doc of allDocs.filter(d => d.folder === folder.id)) {
                const pages = await this.convertJournalToHTML(doc, formData);

                // Add document title page
                const page_html = pages.map(page => `
                        <h3>${page.name}</h3>
                        ${page.html}
                    <div class="page_break"></div>`).join('');

                const page = `
                    <h2>${doc.name}</h2>
                    ${page_html}
                    <div class="page_break"></div>`

                folders[folder.id] = folders[folder.id] || [];
                folders[folder.id].push(page);
            }
        }
        for (let doc of allDocs.filter(d => !d.folder)) {
            const pages = await this.convertJournalToHTML(doc, formData);

            // Add document title page
            const page_html = pages.map(page => `
                        <h3>${page.name}</h3>
                        ${page.html}
                    <div class="page_break"></div>`).join('');

            const page = `
                    <h2>${doc.name}</h2>
                    ${page_html}
                    <div class="page_break"></div>`

            folders.none.push(page);
        }

        const htmlString = Object.entries(folders).map(([folderId, pages]) => {
            const folder = pack.folders.get(folderId);
            const folderName = folder ? folder.name : '';
            return `<div class="folder">
                <h1>${folderName}</h1>
                ${pages.join('')}
            </div>`;
        }).join('');

        const name = pack.metadata.label || pack.metadata.name || pack.metadata.id;

        window.HTML3PDFprogressCallback = callback;

        const win = window.open('', '_blank', 'width=800,height=600');
        const foundryStyles = formData.foundryStyles ? Array.from(document.styleSheets)
            .map((sheet) => {
                try {
                    return Array.from(sheet.cssRules)
                        .filter(rule => {
                            return !(rule instanceof CSSStyleRule) || !rule.selectorText.includes('body');
                        })
                        .map((rule) => rule.cssText)
                        .join('\n');
                } catch (e) {
                    return '';
                }
            })
            .join('\n') : '';
        const docHTML = `
    <html>
        <head>
            <title>Generating PDF</title>
            <script crossorigin="anonymous" referrerpolicy="no-referrer" src="https://cdn.jsdelivr.net/npm/html3pdf@0.12.2/dist/html3pdf.bundle.min.js"></script>
            
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
                        ${foundryStyles}
            </style>
        </head>
        <body>
            <div id="pdf-content">
                ${htmlString}
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
                        filename: "${name}.pdf",
                        margin: 1,
                        pagebreak: { mode: ['avoid-all', 'css', 'legacy'], elementType: 'div', className: 'page_break' },
                        html2canvas: { scale: 2 },
                        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
                    }).from(el).save().listen(window.opener.HTML3PDFprogressCallback).then(() => window.close());
                }
            </script>
        </body>
    </html>
`;
        win.document.open();
        win.document.write(docHTML);
        win.document.close();

        while (!win.closed) {
            console.log('Waiting for the window to close...');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        window.HTML3PDFprogressCallback = null;

    }

    static buildPath(doc, pack, path) {
        if (doc.folder) {
            path.unshift(doc.folder.name);
            return this.buildPath(doc.folder, pack, path);
        }
        return path;
    }

    static async convertJournalToHTML(journal, formData) {
        const htmlPages = [];

        
        for (let page of journal.pages) {
            let content = foundry.utils.getProperty(page, 'text.content');
            if (!content) continue;

            if (formData.enrich) {
                content = await TextEditor.enrichHTML(content);
            }

            if (formData.removeLinks.value == "removeLinks") {
                content = content.replace(/<a[^>]*>(.*?)<\/a>/g, '$1');
            }

            htmlPages.push({
                html: content,
                name: page.name
            });
        }
        return htmlPages;
    }
}

