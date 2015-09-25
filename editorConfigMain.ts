import * as vscode from 'vscode';
import * as editorconfig from 'editorconfig';
import * as fs from 'fs';

import window = vscode.window;
import workspace = vscode.workspace;
import EditorOptions = vscode.EditorOptions;
import Document = vscode.Document;

export function activate(): void {

    let textEditorWatcher = new TextEditorWatcher(new DocumentWatcher());

    // hook into the "editor open" event and apply .editorconfig files on that document
    // i want this to apply for all open editors as well as any new editors, in case my extension
    // is loaded while i have open files

    // This is just temporary, to get the extension activated
    vscode.commands.registerCommand('vscode.editorconfig', () => { /*nothing*/ });

    // register a command handler to generatoe a .editorconfig file
    vscode.commands.registerCommand('vscode.generateeditorconfig', generateEditorConfig);
}

/**
 * Listens to vscode document open and maintains a map (Document => editor config settings)
 */
class DocumentWatcher {

    private _documentToConfigMap: {
        [uri:string]: editorconfig.knownProps;
    };

    constructor() {
        // Listen for new documents being openend
        workspace.onDidAddDocument((document) => this._onDidOpenDocument(document));

        // Listen for saves to ".editorconfig" files and rebuild the map
        workspace.onDidSaveDocument((savedDocument) => {
            if (/\.editorconfig$/.test(savedDocument.getUri().fsPath)) {
                // Saved an .editorconfig file => rebuild map entirely
                this._rebuildConfigMap();
            }
        });

        // Build the map (cover the case that documents were opened before my activation)
        this._rebuildConfigMap();
    }

    public getSettingsForDocument(document:Document): editorconfig.knownProps {
        return this._documentToConfigMap[document.getUri().toString()];
    }

    private _rebuildConfigMap(): void {
        this._documentToConfigMap = {};
        workspace.getAllDocuments().forEach((document) => this._onDidOpenDocument(document));
    }

    private _onDidOpenDocument(document:Document): void {
        if (document.isUntitled()) {
            // Does not have a fs path
            return;
        }

        let uri = document.getUri();

        editorconfig.parse(uri.fsPath).then((config:editorconfig.knownProps) => {
            this._documentToConfigMap[uri.toString()] = config;
        });
    }
}

/**
 * Listens to active text editor and applies editor config settings
 */
class TextEditorWatcher {

    private _documentWatcher:DocumentWatcher;

    constructor(documentWatcher:DocumentWatcher) {
        this._documentWatcher = documentWatcher;
        window.onDidChangeActiveTextEditor((textEditor) => {
            if (!textEditor) {
                // No more open editors
                return;
            }

            let doc = textEditor.getDocument();
            let config = this._documentWatcher.getSettingsForDocument(doc);

            if (Object.keys(config).length === 0) {
                // no configuration found for this file
                return;
            }

            // get current settings
            let currentSettings = textEditor.getOptions();

            // convert editorsettings values to vscode editor options
            let opts: EditorOptions = {
                insertSpaces: config.indent_style ? (config.indent_style === 'tab' ? false : true) : currentSettings.insertSpaces,
                tabSize: config.indent_size ? config.indent_size : currentSettings.tabSize
            };

            window.setStatusBarMessage('EditorConfig: ' + config.indent_style + ' ' + config.indent_size);

            textEditor.setOptions(opts);
        });
    }
}

function generateEditorConfig() {

    // generate a .editorconfig file in the root of the workspace
    // based on the current editor settings and buffer properties

    // WANTS
    // cycle through all open *documents* and create a section for each type
    // pull editor settings directly, because i dont know what 'auto' actuall is
    // would like to open .editorconfig if created OR if one exists in workspace already

    let configFile: string = vscode.workspace.getPath();

    if (configFile === null) {
        vscode.window.showInformationMessage("Please open a folder before generating an .editorconfig file");
        return;
    } else {
        configFile = configFile + '/.editorconfig';
    }

    vscode.extensions.getConfigurationMemento('editor').getValues(<any>{}).then((value) => {
        let indent_style: string = 'tab';
        let indent_size: string = '4';

        switch (value.insertSpaces) {
            case true:
                indent_style = 'space';
                break;
            case false:
                indent_style = 'tab';
                break;
            case 'auto':
                // this is wrong!!
                indent_style = 'space';
                break;

            default:
                break;
        }

        if (value.tabSize === 'auto') {
            indent_size = '4';  // this is wrong!
        } else {
            indent_size = value.tabSize;
        }

        const fileContents =
`root = true

[*]
indent_style = ${indent_style}
indent_size = ${indent_size}
`;

        fs.exists(configFile, (exists) => {
            if (exists) {
                vscode.window.showInformationMessage('An .editorconfig file already exists in your workspace.');
                return;
            }

            fs.writeFile(configFile, fileContents, err => {
                if (err) {
                    vscode.window.showErrorMessage(err.toString());
                    return;
                }
            });
        });

    }, (reason) => {
        console.log('editorConfig error: ' + reason);
    });
}
