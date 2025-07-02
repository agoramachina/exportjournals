const { TextEditor } = foundry.applications.ux || {};

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
        
        const tocMarkdown = this.createTocMarkdown(expandedToc);
        zip.file('TOC.md', tocMarkdown);

        this.generateSubfolderTOCs(expandedToc, zip, []);

        const name = (pack.metadata.label || pack.metadata.name || pack.metadata.id).replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g, '_');
        const blob = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${name}.zip`;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    static createTocMarkdown(toc, level = 1, parent = []) {
        return Object.entries(toc).map(([key, value]) => {
            const heading = '#'.repeat(level) + ' ' + key;
            if (Array.isArray(value) && value.length === 1) {
                const urlEncodedKey = parent.length > 0 ? parent.map(x => encodeURIComponent(x)).join('/') + '/' + encodeURIComponent(key) : encodeURIComponent(key);
                return `- [${value[0]}](<./${urlEncodedKey}/${value[0].replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g, '_')}.md>)`;
            }
            else if (Array.isArray(value)) {
                const urlEncodedKey = parent.length > 0 ? parent.map(x => encodeURIComponent(x)).join('/') + '/' + encodeURIComponent(key) : encodeURIComponent(key);
                return `${heading}\n\n${value.map(page => `- [${page}](<./${urlEncodedKey}/${page.replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g, '_')}.md>)`).join('\n')}`;
            } else {
                return `${heading}\n\n${this.createTocMarkdown(value, level + 1, parent.concat(key))}`;
            }
        }).join('\n\n');
    }

    static generateSubfolderTOCs(toc, zip, path = []) {
        Object.entries(toc).forEach(([key, value]) => {
            const currentPath = [...path, key];
            if (!Array.isArray(value)) {
                const folderToc = this.createSubfolderTocMarkdown(value);
                const goUp = '../'.repeat(currentPath.length);
                const folderContent = `[TOC](<./${goUp}TOC.md>)\n\n${folderToc}`;
                zip.folder(currentPath.join('/')).file('TOC.md', folderContent);
                this.generateSubfolderTOCs(value, zip, currentPath);
            }
        });
    }
    
    static createSubfolderTocMarkdown(toc, level = 1, parent = []) {
        return Object.entries(toc).map(([key, value]) => {
            const heading = '#'.repeat(level) + ' ' + key;
            if (Array.isArray(value) && value.length === 1) {
                const sanitizedName = value[0].replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g, '_');
                return `- [${value[0]}](<./${key}/${sanitizedName}.md>)`;
            }
            else if (Array.isArray(value)) {
                return `${heading}\n\n${value.map(page => {
                    const sanitizedName = page.replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g, '_');
                    return `- [${page}](<./${key}/${sanitizedName}.md>)`;
                }).join('\n')}`;
            } else {
                return `${heading}\n\n${this.createSubfolderTocMarkdown(value, level + 1, parent.concat(key))}`;
            }
        }).join('\n\n');
    }

    static async handleFolderDocs(allDocs, formData, zip, pack, toc) {
        for (let doc of allDocs.sort((a, b) => a.sort ?? 0 - b.sort ?? 0)) {
            const path = this.buildPath(doc, pack, []);
            const pages = await this.convertJournalToMarkdown(doc, formData, pack, path);
            path.push(doc.name);
            const sanitizedPages = []
            for (let page of pages) {
                const sanitizedName = page.name.replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g, '_');
                sanitizedPages.push(page.name);
                zip.folder(path.join('/')).file(`${sanitizedName}.md`, page.markdown);

                if (page.imageUrls.length > 0) {
                    for (const url of page.imageUrls) {
                        const response = await fetch(url);
                        if (!response.ok) continue;
                        const blob = await response.blob();
                        const imageName = url.split('/').pop();
                        zip.folder('asset').file(imageName, blob);
                    }
                }
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

    static getImageUrlsAndRerout(targetPack, currentDoc) {
        // regex for src="" on img
        const rgx = /<img[^>]+src="([^"]+)"[^>]*>/g;
        return {
            pattern: rgx,
            enricher: async (match, options) => {
                const src = match[1];
                if (src.startsWith('http') || src.startsWith('data:')) {
                    return match[0]; // external or data URI, do not change
                }
                
                options.urls.push(src);
                const newSrc = "./" + "../".repeat(options.pathLength + 1) + 'asset/' + src.split('/').pop();
                //replace the src in the match
                return match[0].replace(src, newSrc);
            }
        }
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

    static async convertJournalToMarkdown(journal, formData, pack, path) {
        // Use different converter approach for v12
        const converter = game.system?.documentTypes?.JournalEntryPage?.htmlConverter || 
                         foundry.applications.sheets.journal.JournalEntryPageTextSheet?._converter ||
                         this.getBasicMarkdownConverter();
        
        const pathLength = path.length;
        const markdowns = []
       
        for (let page of journal.pages) {
            let content = foundry.utils.getProperty(page, 'text.content');
            const imageUrls = [];
            if (!content) continue;

            if (formData.removeLinks == 'convertLinks') {
                const linkEnricher = this.getLinkEnricher(pack, journal);
                const matches = content.matchAll(linkEnricher.pattern);
                for (const match of matches) {
                    const enrichedLink = await linkEnricher.enricher(match, {  });
                    content = content.replace(match[0], enrichedLink);
                }
            }

            if (formData.withImages) {
                
                const imageEnricher = this.getImageUrlsAndRerout(pack, journal);
                const matches = content.matchAll(imageEnricher.pattern);
                for (const match of matches) {
                    const changedImage = await imageEnricher.enricher(match, { urls: imageUrls, pathLength });
                    content = content.replace(match[0], changedImage);
                }
            }

            if (formData.enrich) {
                // Use enrichHTML if available, otherwise use basic enricher
                if (TextEditor?.enrichHTML) {
                    content = await TextEditor.enrichHTML(content);
                } else if (game.system?.data?.template?.Item) {
                    // Basic enrichment for v12
                    content = await this.basicEnrichHTML(content);
                }
            }

            if (formData.removeLinks == "removeLinks") {
                content = content.replace(/<a[^>]*>(.*?)<\/a>/g, '$1');
            }

            let markdown = converter.makeMarkdown ? converter.makeMarkdown(content) : this.htmlToMarkdown(content);

            const baseToc = `[TOC](<./${'../'.repeat(pathLength + 1)}/TOC.md>)`;
            let breadcrumb = [baseToc];
            for (let i = 0; i < pathLength; i++) {
                const goUps = '../'.repeat(pathLength - i);
                breadcrumb.push(`[${path[i]}](<./${goUps}TOC.md>)`);
            }

            markdown = `${breadcrumb.join(" / ")}\n\n` + markdown;

            markdowns.push({
                markdown,
                name: page.name,
                imageUrls
            })
        }
        return markdowns;
    }

    static getBasicMarkdownConverter() {
        return {
            makeMarkdown: (html) => this.htmlToMarkdown(html)
        };
    }

    static htmlToMarkdown(html) {
        // Basic HTML to Markdown conversion for v12 compatibility
        return html
            .replace(/<h([1-6])>/g, (match, level) => '#'.repeat(parseInt(level)) + ' ')
            .replace(/<\/h[1-6]>/g, '\n\n')
            .replace(/<p>/g, '')
            .replace(/<\/p>/g, '\n\n')
            .replace(/<br\s*\/?>/g, '\n')
            .replace(/<strong>/g, '**')
            .replace(/<\/strong>/g, '**')
            .replace(/<em>/g, '*')
            .replace(/<\/em>/g, '*')
            .replace(/<ul>/g, '')
            .replace(/<\/ul>/g, '\n')
            .replace(/<ol>/g, '')
            .replace(/<\/ol>/g, '\n')
            .replace(/<li>/g, '- ')
            .replace(/<\/li>/g, '\n')
            .replace(/<a[^>]*href="([^"]*)"[^>]*>/g, '[')
            .replace(/<\/a>/g, ']($1)')
            .replace(/\n\n\n+/g, '\n\n');
    }

    static async basicEnrichHTML(content) {
        // Basic enrichment for v12 - mainly just return content as-is
        // More sophisticated enrichment would require specific v12 APIs
        return content;
    }
}