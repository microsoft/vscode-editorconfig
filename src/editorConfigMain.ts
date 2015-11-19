import * as editorconfig from 'editorconfig';
import * as fs from 'fs';
import {commands, window, workspace, ExtensionContext, TextEditorOptions, TextEditor, TextDocument, Disposable} from 'vscode';

export function activate(ctx: ExtensionContext): void {

    let documentWatcher = new DocumentWatcher();

    ctx.subscriptions.push(documentWatcher);
    ctx.subscriptions.push(window.onDidChangeActiveTextEditor((textEditor) => {
        applyEditorConfigToTextEditor(textEditor, documentWatcher);
    }));
    applyEditorConfigToTextEditor(window.activeTextEditor, documentWatcher);

    // register a command handler to generate a .editorconfig file
    commands.registerCommand('vscode.generateeditorconfig', generateEditorConfig);
}

interface IEditorConfigProvider {
    getSettingsForDocument(document: TextDocument): editorconfig.knownProps;
}

/**
 * Listens to vscode document open and maintains a map (Document => editor config settings)
 */
class DocumentWatcher implements IEditorConfigProvider {

    private _documentToConfigMap: { [uri: string]: editorconfig.knownProps };
    private _disposable: Disposable;

    constructor() {

        let subscriptions: Disposable[] = []

        // Listen for new documents being openend
        subscriptions.push(workspace.onDidOpenTextDocument((doc) => this._onDidOpenDocument(doc)));

        // Listen for saves to ".editorconfig" files and rebuild the map
        subscriptions.push(workspace.onDidSaveTextDocument(savedDocument => {
            if (/\.editorconfig$/.test(savedDocument.fileName)) {
                // Saved an .editorconfig file => rebuild map entirely
                this._rebuildConfigMap();
            }
        }));

        // dispose event subscriptons upon disposal
        this._disposable = Disposable.from(...subscriptions);

        // Build the map (cover the case that documents were opened before my activation)
        this._rebuildConfigMap();
    }

    public dispose(): void {
        this._disposable.dispose();
    }

    public getSettingsForDocument(document: TextDocument): editorconfig.knownProps {
        return this._documentToConfigMap[document.fileName];
    }

    private _rebuildConfigMap(): void {
        this._documentToConfigMap = {};
        workspace.textDocuments.forEach(document => this._onDidOpenDocument(document));
    }

    private _onDidOpenDocument(document: TextDocument): void {
        if (document.isUntitled) {
            // Does not have a fs path
            return;
        }

        let path = document.fileName;
        editorconfig.parse(path).then((config: editorconfig.knownProps) => {
            // console.log('storing ' + path + ' to ' + JSON.stringify(config, null, '\t'));
            this._documentToConfigMap[path] = config;

            applyEditorConfigToTextEditor(window.activeTextEditor, this);
        });
    }
}

function applyEditorConfigToTextEditor(textEditor:TextEditor, provider:IEditorConfigProvider): void {
    if (!textEditor) {
        // No more open editors
        return;
    }

    let doc = textEditor.document;
    let editorconfig = provider.getSettingsForDocument(doc);

    if (!editorconfig) {
        // no configuration found for this file
        return;
    }

    let { insertSpaces, tabSize } = textEditor.options;
    let newOptions = Utils.fromEditorConfig(
        editorconfig,
        {
            insertSpaces,
            tabSize
        }
    );

    // console.log('setting ' + textEditor.document.fileName + ' to ' + JSON.stringify(newOptions, null, '\t'));

    window.setStatusBarMessage('EditorConfig: ' + (newOptions.insertSpaces ? "Spaces:" : "Tabs:") + ' ' + newOptions.tabSize, 1500);

    textEditor.options = newOptions;
}

/**
 * Generate an .editorconfig file in the root of the workspace based on the current vscode settings.
 */
function generateEditorConfig() {
    if (!workspace.rootPath) {
        window.showInformationMessage("Please open a folder before generating an .editorconfig file");
        return;
    }

    let editorConfigurationNode = workspace.getConfiguration('editor');
    let {indent_style, indent_size} = Utils.toEditorConfig({
        insertSpaces: editorConfigurationNode.get<string | boolean>('insertSpaces'),
        tabSize: editorConfigurationNode.get<string | number>('tabSize')
    });

    const fileContents =
        `root = true

[*]
indent_style = ${indent_style}
indent_size = ${indent_size}
`;

    let editorconfigFile = workspace.rootPath + '/.editorconfig';
    fs.exists(editorconfigFile, (exists) => {
        if (exists) {
            window.showInformationMessage('An .editorconfig file already exists in your workspace.');
            return;
        }

        fs.writeFile(editorconfigFile, fileContents, err => {
            if (err) {
                window.showErrorMessage(err.toString());
                return;
            }
        });
    });
}

export class Utils {

    /**
     * Convert .editorconfig values to vscode editor options
     */
    public static fromEditorConfig(
        config: editorconfig.knownProps,
        defaults: {
            insertSpaces: boolean;
            tabSize: number;
        }
    ): TextEditorOptions {
        return {
            insertSpaces: config.indent_style ? (config.indent_style === 'tab' ? false : true) : defaults.insertSpaces,
            tabSize: config.indent_size ? config.indent_size : defaults.tabSize
        };
    }

    /**
     * Convert vscode editor options to .editorsconfig values
     */
    public static toEditorConfig(
        options: {
            insertSpaces: boolean|string;
            tabSize: number|string;
        }
    ) {
        let indent_style = 'tab';
        let indent_size = '4';

        switch (options.insertSpaces) {
            case true:
                indent_style = 'space';
                break;
            case false:
                indent_style = 'tab';
                break;
            case 'auto':
                indent_style = 'tab';
                break;
        }

        if (options.tabSize !== 'auto') {
            indent_size = String(options.tabSize);
        }

        return {
            indent_style,
            indent_size
        };
    }
}
