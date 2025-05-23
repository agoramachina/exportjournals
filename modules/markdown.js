const { TextEditor } = foundry.applications.ux;

export class ExportAsMarkdown {
    static async exportPack(pack, formData) {
        const allDocs = await pack.getDocuments();
        const zip = new JSZip();

        for(let doc of allDocs) {
            const pages = await this.convertJournalToMarkdown(doc, formData);
            const path = this.buildPath(doc, pack, []);
            path.push(doc.name);
            for( let page of pages) {
                const sanitizedName = page.name.replace(/[^a-zA-Z0-9-_]/g, '_');
                zip.folder(path.join('/')).file(`${sanitizedName}.md`, page.markdown);
            }
        }
        
        const name = pack.metadata.label || pack.metadata.name || pack.metadata.id;
        const blob = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${name}.zip`;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    static buildPath(doc, pack, path) {
        if (doc.folder) {
            path.unshift(doc.folder.name);
            return this.buildPath(doc.folder, pack, path);
        }
        return path;
    }

    static async convertJournalToMarkdown(journal, formData) {
        const converter = foundry.applications.sheets.journal.JournalEntryPageTextSheet._converter

        const markdowns = []
        
        for (let page of journal.pages) {
            let content = foundry.utils.getProperty(page, 'text.content');
            if (!content) return '';

            if (formData.enrich) {
                content = await TextEditor.enrichHTML(content)
            }

            if (formData.removeLinks) {
                content = content.replace(/<a[^>]*>(.*?)<\/a>/g, '$1');
            }
            
            const markdown = converter.makeMarkdown(content)
            markdowns.push({ 
                markdown,
                name: page.name
            })
        }
        return markdowns;
    }
}