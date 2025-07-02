import { ExportAsMarkdown } from "./markdown.js";
import { ExportAsPDF } from "./pdf2.js";

Hooks.on('getCompendiumDirectoryEntryContext', (_, menuitems) => {
    if (!game.user.isGM) return false;

    const condition = (li) => {
        const packName = li.data('pack');
        const pack = game.packs.get(packName);
        return 'JournalEntry' == pack?.documentName;
    };

    menuitems.push({
        name: 'exportJournals.exportMarkdown',
        icon: '<i class="fas fa-markdown"></i>',
        condition,
        callback: (li) => exportCompendium(li),
    });
})

async function exportCompendium(li) {
    const packName = li.data('pack');
    const pack = game.packs.get(packName);
    new Exporter(pack).render(true);
}

class Exporter extends Application {
    constructor(pack) {
        super();
        this.pack = pack;
        this.history = [];
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: 'modules/exportjournals/templates/exporter.hbs',
            classes: ['standard-form'],
            width: 500,
            title: this.pack?.metadata?.label || this.pack?.metadata?.name || this.pack?.metadata?.id || 'Export Journals'
        });
    }

    get title() {
        return this.pack.metadata.label || this.pack.metadata.name || this.pack.metadata.id;
    }

    getData() {
        return {
            pack: this.pack
        };
    }

    activateListeners(html) {
        super.activateListeners(html);
        
        html.find('[data-action="exportMarkdown"]').click(async (ev) => {
            const formData = new FormDataExtended(this.element.find('form')[0]).object;
            ExportAsMarkdown.exportPack(this.pack, formData);
            this.close();
        });

        html.find('[data-action="exportPDF"]').click(async (ev) => {
            window.receiveLogFromChild = this.receiveLogFromChild.bind(this);
            this.progress = ui.notifications.info(game.i18n.localize('exportJournals.exportPDF'), { permanent: true });
            const formData = new FormDataExtended(this.element.find('form')[0]).object;
            await ExportAsPDF.exportPack(this.pack, formData);
            window.receiveLogFromChild = null;
            this.progress?.remove();
            this.close();
        });
    }

    updateProgress(progress) {
        // Note: v12 doesn't have the same progress notification system
        // This is a placeholder for potential future enhancement
    }

    receiveLogFromChild(log) {
        this.history.push(log);
        this.history = this.history.slice(-3);
        const prog = this.element.find('.progress')[0];
        if (prog) {
            prog.classList.remove('hidden');
            prog.textContent = this.history.join('\n');
        }
    }
}