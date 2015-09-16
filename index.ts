import * as vscode from 'vscode';
import * as editorconfig from 'editorconfig';
import * as vscode2 from 'vscode2';
import * as fs from 'fs';

export function activate() {
    
    // hook into the "editor open" event and apply .editorconfig files on that document
    // i want this to apply for all open editors as well as any new editors, in case my extension 
    // is loaded while i have open files
    
    vscode2.shell.onEditorOpen(editor => {
        applyEditorConfig(editor);
    })    
    
    // register a command handler to generatoe a .editorconfig file
    vscode.commands.registerCommand('vscode.generateeditorconfig', generateEditorConfig);
}

function applyEditorConfig(e: vscode2.Editor) {

    // get the file path to pass to the editorconfig module
    const doc: vscode2.Document = e.getDocument();
    const filepath: string = doc.getUri().path;
    
    // check to see if this is an empty, no name file
    if (filepath === '') {
        return;
    }

    editorconfig
        .parse(filepath)
        .then(config => {

            // check to see if we found a .editorconfig
            if (Object.keys(config).length === 0) {
                return;
            }
            
            // we did, so set the properties
            const indentStyle = config.indent_style || (doc.insertSpaces() ? 'space' : 'tab');

            if (indentStyle === 'tab') {
                doc.insertSpaces = false;
                if (config.indent_size) {
                    doc.setTabSize = config.indent_size;
                }
            }

            if (config.charset) {
                doc.setEncoding(config.charset);
            }

            if (config.end_of_line) {
                doc.setEndOfLine = config.end_of_line;
            }

            if (config.trim_trailing_whitespace) {
                doc.trimTrailingWhitespace = config.trim_trailing_whitespace;
            }

        });
}

function generateEditorConfig() {
    // generate a .editorconfig file in the root of the workspace
    // based on the current editor settings and buffer properties
   
    const configFile: string = vscode.workspace.getPath() + '.editorconfig';

    const configSvcs = {
        editor: vscode.Services.Configuration.get("editor");
        core: vscode.Services.Configuration.get("core");
    }

    // pull settings from configuration service
    const indent_style = configSvcs.editor.insertTabs() ? 'tab' : 'space';
    const indent_size = configSvcs.editor.tabSize();
    const end_of_line = configSvcs.editor.eol();
    const charset = configSvcs.core.charset();
    const trim_trailing_whitespace = configSvcs.core.trimTrailingWhitespace();
    const insert_final_newline = configSvcs.core.insertFinalNewline();
   
    // atom pattern
    const fileContents = `
        root = true

        [*]
        indent_style = ${indent_style}
        indent_size = ${indent_size}
        end_of_line = ${end_of_line}
        charset = ${charset}
        trim_trailing_whitespace = ${trim_trailing_whitespace}
        insert_final_newline = ${insert_final_newline}
        `;

    fs.access(configFile, err => {
        if (err) {
            fs.writeFile(configFile, fileContents, err => {
                if (err) {
                    vscode.notifications.addError(err);
                    return;
                }

                vscode.notifications.addSuccess('.editorconfig file successfully generated', {
                    detail: 'An .editorconfig file was successfully generated in your project based on your current settings.'
                });
            });
        } else {
            vscode.notifications.addError('An .editorconfig file already exists in your workspace root.');
        }
    });
}

