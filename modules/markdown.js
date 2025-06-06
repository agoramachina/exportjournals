const { TextEditor } = foundry.applications.ux;

export class ExportAsMarkdown {
    static async exportPack(pack, formData) {
        const allDocs = await pack.getDocuments();
        const zip = new JSZip();
        const noParentDocs = allDocs.filter(doc => !doc.folder);
        const toc = {}

        await this.handleFolderDocs(noParentDocs, formData, zip, pack, toc);

        for (const folder of Array.from(pack.folders).sort((a, b) => a.sort ?? 0 - b.sort ?? 0)) {
            const folderDocs = allDocs.filter(doc => doc.folder === folder);
            if (folderDocs.length === 0) continue;

            await this.handleFolderDocs(folderDocs, formData, zip, pack, toc);
        }

        const expandedToc = foundry.utils.expandObject(toc);
        const createTocMarkdown = (toc, level = 1, parent = []) => {
            return Object.entries(toc).map(([key, value]) => {
                const heading = '#'.repeat(level) + ' ' + key;
                if (Array.isArray(value) && value.length === 1) {
                    const linkKey = parent.length > 0 ? parent.join('/') + '/' + key : key;
                    const urlEncodedKey = encodeURIComponent(linkKey);
                    return `- [${value[0]}](<./${urlEncodedKey}/${value[0].replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g, '_')}.md>)`;
                }
                else if (Array.isArray(value)) {
                    const linkKey = parent.length > 0 ? parent.join('/') + '/' + key : key;
                    const urlEncodedKey = encodeURIComponent(linkKey);
                    return `${heading}\n\n${value.map(page => `- [${page}](<./${urlEncodedKey}/${page.replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g, '_')}.md>)`).join('\n')}`;
                } else {
                    return `${heading}\n\n${createTocMarkdown(value, level + 1, parent.concat(key))}`;
                }
            }).join('\n\n');
        }

        const tocMarkdown = createTocMarkdown(expandedToc);
        zip.file('TOC.md', tocMarkdown);

        const name = pack.metadata.label || pack.metadata.name || pack.metadata.id;
        const blob = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${name}.zip`;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    static async handleFolderDocs(allDocs, formData, zip, pack, toc) {
        for (let doc of allDocs.sort((a, b) => a.sort ?? 0 - b.sort ?? 0)) {
            const path = this.buildPath(doc, pack, []);
            const pages = await this.convertJournalToMarkdown(doc, formData, pack, path.length);
            path.push(doc.name);
            const sanitizedPages = []
            for (let page of pages) {
                const sanitizedName = page.name.replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g, '_');
                sanitizedPages.push(page.name);
                zip.folder(path.join('/')).file(`${sanitizedName}.md`, page.markdown);
            }
            foundry.utils.setProperty(toc, path.join('.'), sanitizedPages);
        }
    }

    static buildPath(doc, pack, path) {
        if (doc.folder) {
            path.unshift(doc.folder.name);
            return this.buildPath(doc.folder, pack, path);
        }
        return path;
    }

    static getLinkEnricher(targetPack, currentDoc) {
        const documentTypes = ["Compendium", "UUID"];
        const rgx = new RegExp(`@(${documentTypes.join("|")})\\[([^#\\]]+)(?:#([^\\]]+))?](?:{([^}]+)})?`, "g");
        return {
            pattern: rgx,
            enricher: async (match, options) => {
                const [type, target, hash, name] = match.slice(1, 5);
                let doc;
                if (type === 'UUID') {
                    doc = await foundry.utils.fromUuid(target)
                } else if (type === "Compendium") {
                    const { collection: pack, id } = foundry.utils.parseUuid(`Compendium.${target}`) ?? {};
                    if (id && pack) {
                        if(pack.index.has(id))
                            doc = await pack.getDocument(id);
                        else
                            doc = await pack.getName(id)
                        
                    }
                }
                if (doc && doc.pack == targetPack.metadata.id) {

                    // make markdown link
                    const path = ExportAsMarkdown.buildPath(doc, targetPack, []);
                    const escapedPath = path.map(x => encodeURIComponent(x));
                    const currentPath = ExportAsMarkdown.buildPath(currentDoc, targetPack, []);
                    let finalLink = doc.name
                    if(doc.documentName == 'JournalEntry') {
                        escapedPath.push(encodeURIComponent(doc.name));
                        finalLink = Array.from(doc.pages)[0].name;
                    }

                    const goUp = currentPath.length > 1 ? '../'.repeat(currentPath.length + 1) : '';
                    const sanitizedName = finalLink.replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g, '_')
                    //return html link
                    return `<a href="./${goUp}${escapedPath.join('/')}/${sanitizedName}.md">${name || doc.name}</a>`;
                }

                return match[0];
            }
        }
    }

    static async convertJournalToMarkdown(journal, formData, pack, pathLength) {
        const converter = foundry.applications.sheets.journal.JournalEntryPageTextSheet._converter

        const markdowns = []
       
        for (let page of journal.pages) {
            let content = foundry.utils.getProperty(page, 'text.content');
            if (!content) continue;

            if (formData.removeLinks == 'convertLinks') {
                const linkEnricher = this.getLinkEnricher(pack, journal);
                const matches = content.matchAll(linkEnricher.pattern);
                for (const match of matches) {
                    const enrichedLink = await linkEnricher.enricher(match, {  });
                    content = content.replace(match[0], enrichedLink);
                }
            }

            if (formData.enrich) {
                content = await TextEditor.enrichHTML(content)
            }

            if (formData.removeLinks == "removeLinks") {
                content = content.replace(/<a[^>]*>(.*?)<\/a>/g, '$1');
            }

            let markdown = converter.makeMarkdown(content)

            const goUp = '../'.repeat(pathLength + 1);
            markdown = `[TOC](<./${goUp}TOC.md>)\n\n` + markdown;

            markdowns.push({
                markdown,
                name: page.name
            })
        }
        return markdowns;
    }

    static #getTextNodes(parent) {
        const text = [];
        const walk = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT);
        while (walk.nextNode()) text.push(walk.currentNode);
        return text;
    }
}