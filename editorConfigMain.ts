import * as editorconfig from 'editorconfig';
import * as fs from 'fs';
import {commands, extensions, window, workspace, TextEditorOptions, TextDocument, Disposable} from 'vscode';

export function activate(disposables: Disposable[]): void {

    let documentWatcher = new DocumentWatcher();
    let textEditorWatcher = new TextEditorWatcher(documentWatcher);

    disposables.push(documentWatcher);
    disposables.push(textEditorWatcher);

    // register a command handler to generatoe a .editorconfig file
    commands.registerCommand('vscode.generateeditorconfig', generateEditorConfig);
}

/**
 * Listens to vscode document open and maintains a map (Document => editor config settings)
 */
class DocumentWatcher {

    private _documentToConfigMap: { [uri: string]: editorconfig.knownProps };
    private _disposable: Disposable;

    constructor() {

        let subscriptions: Disposable[] = []

        // Listen for new documents being openend
        workspace.onDidOpenTextDocument(this._onDidOpenDocument, this, subscriptions);

        // Listen for saves to ".editorconfig" files and rebuild the map
        workspace.onDidSaveTextDocument(savedDocument => {
            if (/\.editorconfig$/.test(savedDocument.getPath())) {
                // Saved an .editorconfig file => rebuild map entirely
                this._rebuildConfigMap();
            }
        }, undefined, subscriptions);

        // dispose event subscriptons upon disposal
        this._disposable = Disposable.of(...subscriptions);

        // Build the map (cover the case that documents were opened before my activation)
        this._rebuildConfigMap();
    }

    public dispose(): void {
        this._disposable.dispose();
    }

    public getSettingsForDocument(document: TextDocument): editorconfig.knownProps {
        return this._documentToConfigMap[document.getPath()];
    }

    private _rebuildConfigMap(): void {
        this._documentToConfigMap = {};
        workspace.getTextDocuments().forEach(document => this._onDidOpenDocument(document));
    }

    private _onDidOpenDocument(document: TextDocument): void {
        if (document.isUntitled()) {
            // Does not have a fs path
            return;
        }

        let path = document.getPath();
        editorconfig.parse(path).then((config: editorconfig.knownProps) => {
            this._documentToConfigMap[path] = config;
        });
    }
}

/**
 * Listens to active text editor and applies editor config settings
 */
class TextEditorWatcher {

    private _documentWatcher: DocumentWatcher;
    private _disposable: Disposable;

    constructor(documentWatcher: DocumentWatcher) {
        this._documentWatcher = documentWatcher;
        this._disposable = window.onDidChangeActiveTextEditor((textEditor) => {
            if (!textEditor) {
                // No more open editors
                return;
            }

            let doc = textEditor.getTextDocument();
            let config = this._documentWatcher.getSettingsForDocument(doc);

            if (!config) {
                // no configuration found for this file
                return;
            }

            // get current settings
            let currentSettings = textEditor.getOptions();

            // convert editorsettings values to vscode editor options
            let opts: TextEditorOptions = {
                insertSpaces: config.indent_style ? (config.indent_style === 'tab' ? false : true) : currentSettings.insertSpaces,
                tabSize: config.indent_size ? config.indent_size : currentSettings.tabSize
            };

            window.setStatusBarMessage('EditorConfig: ' + config.indent_style + ' ' + config.indent_size, 1500);

            textEditor.setOptions(opts);
        });
    }

    public dispose() {
        this._disposable.dispose();
    }
}

function generateEditorConfig() {

    // generate a .editorconfig file in the root of the workspace
    // based on the current editor settings and buffer properties

    // WANTS
    // cycle through all open *documents* and create a section for each type
    // pull editor settings directly, because i dont know what 'auto' actuall is
    // would like to open .editorconfig if created OR if one exists in workspace already

    let configFile: string = workspace.getPath();

    if (configFile === null) {
        window.showInformationMessage("Please open a folder before generating an .editorconfig file");
        return;
    } else {
        configFile = configFile + '/.editorconfig';
    }

    extensions.getConfigurationMemento('editor').getValues(<any>{}).then((value) => {
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
                window.showInformationMessage('An .editorconfig file already exists in your workspace.');
                return;
            }

            fs.writeFile(configFile, fileContents, err => {
                if (err) {
                    window.showErrorMessage(err.toString());
                    return;
                }
            });
        });

    }, (reason) => {
        console.log('editorConfig error: ' + reason);
    });
}
