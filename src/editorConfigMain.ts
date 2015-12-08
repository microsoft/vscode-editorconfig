import * as editorconfig from 'editorconfig';
import * as fs from 'fs';
import {commands, window, workspace, ExtensionContext, TextEditorOptions,
    TextEditor, TextEdit, TextDocument, Disposable, Position} from 'vscode';

export function activate(ctx: ExtensionContext): void {

    let documentWatcher = new DocumentWatcher();

    ctx.subscriptions.push(documentWatcher);
    ctx.subscriptions.push(window.onDidChangeActiveTextEditor((textEditor) => {
        applyEditorConfigToTextEditor(textEditor, documentWatcher);
    }));
    applyEditorConfigToTextEditor(window.activeTextEditor, documentWatcher);

    // register a command handler to generatoe a .editorconfig file
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
            applyOnSaveTransformations(savedDocument, this);
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
            // workaround for the fact that sometimes indent_size is set to "tab":
            // see https://github.com/editorconfig/editorconfig-core-js/blob/b2e00d96fcf3be242d4bf748829b8e3a778fd6e2/editorconfig.js#L56
            if (config.indent_size === 'tab') {
                delete config.indent_size;
            }

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

    let newOptions = Utils.fromEditorConfig(editorconfig, textEditor.options.insertSpaces, textEditor.options.tabSize);

    // console.log('setting ' + textEditor.document.fileName + ' to ' + JSON.stringify(newOptions, null, '\t'));

    window.setStatusBarMessage('EditorConfig: ' + (newOptions.insertSpaces ? "Spaces:" : "Tabs:") + ' ' + newOptions.tabSize, 1500);

    textEditor.options = newOptions;
}

function applyOnSaveTransformations(
    textDocument:TextDocument,
    provider:IEditorConfigProvider): void {

    let editorconfig = provider.getSettingsForDocument(textDocument);

    if (!editorconfig) {
        // no configuration found for this file
        return;
    }

    insertFinalNewlineTransform(editorconfig, textDocument);
}

function insertFinalNewlineTransform(editorconfig: editorconfig.knownProps, textDocument: TextDocument): void {
    if (editorconfig.insert_final_newline && textDocument.lineCount > 0) {
        let lastLine = textDocument.lineAt(textDocument.lineCount - 1);
        let lastLineLength = lastLine.text.length;
        if (lastLineLength < 1) {
            return;
        }
        let editor = findEditor(textDocument);
        if (!editor) {
            return;
        }
        editor.edit(edit => {
            let pos = new Position(lastLine.lineNumber, lastLineLength);
            edit.insert(pos, newline(editorconfig));
            textDocument.save();
        });
    }
}

function newline(editorconfig: editorconfig.knownProps): string {
    if (editorconfig.end_of_line === 'cr') {
        return '\r';
    } else if (editorconfig.end_of_line == 'crlf') {
        return '\r\n';
    }
    return '\n';
}

function findEditor(textDocument: TextDocument): TextEditor {
    for (let editor of window.visibleTextEditors) {
        if (editor.document === textDocument) {
            return editor;
        }
    }

    return null;
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
    let {indent_style, indent_size} = Utils.toEditorConfig(
        editorConfigurationNode.get<string | boolean>('insertSpaces'),
        editorConfigurationNode.get<string | number>('tabSize')
    );

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
     * Convert .editorsconfig values to vscode editor options
     */
    public static fromEditorConfig(config:editorconfig.knownProps, defaultInsertSpaces:boolean, defaultTabSize:number): TextEditorOptions {
        return {
            insertSpaces: config.indent_style ? (config.indent_style === 'tab' ? false : true) : defaultInsertSpaces,
            tabSize: config.indent_size ? config.indent_size : defaultTabSize
        };
    }

    /**
     * Convert vscode editor options to .editorsconfig values
     */
    public static toEditorConfig(configuredInsertSpaces:boolean|string, configuredTabSize:number|string) {
        let indent_style = 'tab';
        let indent_size = '4';

        switch (configuredInsertSpaces) {
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

        if (configuredTabSize !== 'auto') {
            indent_size = String(configuredTabSize);
        }

        return {
            indent_style: indent_style,
            indent_size: indent_size
        };
    }
}
