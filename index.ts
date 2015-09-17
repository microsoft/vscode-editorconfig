import * as vscode from 'vscode';
import * as editorconfig from 'editorconfig';
import * as fs from 'fs';


export function activate() {
    
    // hook into the "editor open" event and apply .editorconfig files on that document
    // i want this to apply for all open editors as well as any new editors, in case my extension 
    // is loaded while i have open files
    vscode.commands.registerCommand('vscode.editorconfig', startEditorConfig);

    // register a command handler to generatoe a .editorconfig file
    vscode.commands.registerCommand('vscode.generateeditorconfig', generateEditorConfig);
}

function startEditorConfig() {
    let editor_tabSize:any;
    let editor_insertSpaces:any;

    vscode.shell.onEditorOpen(e => {
        
        let subscription = e.onDocumentChange(function() {
            
            const doc: vscode.Document = e.getDocument();
            const filepath: string = doc.getUri().fsPath;

            // the editorconfig module will scan the folder and parent folders to build
            // an editorconfig property bag for us
            editorconfig
                .parse(filepath)
                .then(config => {

                    // check to see if we found an .editorconfig file
                    if (Object.keys(config).length === 0) {
                        return;
                    }
                    
                    // get our settings for insertSpaces and tabSize (all i can get right now)
                    vscode.Services.ConfigurationService.loadConfiguration("editor").then(
                        value => {
                            editor_insertSpaces = value.insertSpaces;  // auto, true, false
                            editor_tabSize = value.tabSize; //auto, 2, 4, 6, ...
                        
                            // initialize our editor options with the current settings                     
                            let opts:vscode.EditorOptions = {useSpaces: editor_insertSpaces, 
                                                            tabSize: editor_tabSize};
                                                            
                            // if editorconfig properties exist, use them otherwise keep defaults
                            // useSpaces must be converted 'tab' -> false, 'space' -> true
                            opts.useSpaces = config.indent_style ? (config.indent_style === 'tab' ? false : true) : editor_insertSpaces;
                            opts.tabSize = config.indent_size ? config.indent_size : editor_tabSize;
                            
                            // TODO: set these properties when they become available!                        
                            // config.charset
                            // config.end_of_line
                            // config.trim_trailing_whitespace
                                                    
                            // update our editor
                            e.updateOptions(opts);
    
                        },
                    reason => {
                        // we didnt get our editor configuration, bail out
                        Promise.reject("Failed to load editor configuration");
                    });
                });
        });
        
        // clean up - do i need to dispose this?
        //subscription.dispose();
        
    });
}

function generateEditorConfig() {
    // generate a .editorconfig file in the root of the workspace
    // based on the current editor settings and buffer properties
   
   if (vscode.workspace.getPath() === null) {
       vscode.shell.showInformationMessage("Please open a folder before generating an .editorconfig file");
       return;
   }
   
   const configFile: string = vscode.workspace.getPath() + '/.editorconfig';

   fs.exists(configFile, exists => {
       if (exists) {
           vscode.shell.showInformationMessage("An .editorconfig file already exists in this folder.");
           return;
       }
       
       
   });
   
                       // get our settings for insertSpaces and tabSize (all i can get right now)
                    // vscode.Services.ConfigurationService.loadConfiguration("editor").then(value => {
                    //     editor_insertSpaces = value.insertSpaces;  // auto, true, false
                    //     editor_tabSize = value.tabSize; //auto, 2, 4, 6, ...
                    
                    // // is this right?
                    // }).then(value => {
                        
                    //     // initialize our editor options with the current settings                     
                    //     let opts:vscode.EditorOptions = {useSpaces: editor_insertSpaces, 
                    //                                        tabSize: editor_tabSize};
                                                           
                    //     // if editorconfig properties exist, use them otherwise keep defaults
                    //     // useSpaces must be converted 'tab' -> false, 'space' -> true
                    //     opts.useSpaces = config.indent_style ? (config.indent_style === 'tab' ? false : true) : editor_insertSpaces;
                    //     opts.tabSize = config.indent_size ? config.indent_size : editor_tabSize;
                        
                    //     // TODO: set these properties when they become available!                        
                    //     // config.charset
                    //     // config.end_of_line
                    //     // config.trim_trailing_whitespace
                                                
                    //     // update our editor
                    //     e.updateOptions(opts);

                    });

    // const configSvcs = {
    //     editor: vscode.Services.Configuration.get("editor");
    //     core: vscode.Services.Configuration.get("core");
    // }

    // // pull settings from configuration service
    // const indent_style = configSvcs.editor.insertTabs() ? 'tab' : 'space';
    // const indent_size = configSvcs.editor.tabSize();
    // const end_of_line = configSvcs.editor.eol();
    // const charset = configSvcs.core.charset();
    // const trim_trailing_whitespace = configSvcs.core.trimTrailingWhitespace();
    // const insert_final_newline = configSvcs.core.insertFinalNewline();
   
    // // atom pattern
    // const fileContents = `
    //     root = true

    //     [*]
    //     indent_style = ${indent_style}
    //     indent_size = ${indent_size}
    //     end_of_line = ${end_of_line}
    //     charset = ${charset}
    //     trim_trailing_whitespace = ${trim_trailing_whitespace}
    //     insert_final_newline = ${insert_final_newline}
    //     `;

    // fs.access(configFile, err => {
    //     if (err) {
    //         fs.writeFile(configFile, fileContents, err => {
    //             if (err) {
    //                 vscode.notifications.addError(err);
    //                 return;
    //             }

    //             vscode.notifications.addSuccess('.editorconfig file successfully generated', {
    //                 detail: 'An .editorconfig file was successfully generated in your project based on your current settings.'
    //             });
    //         });
    //     } else {
    //         vscode.notifications.addError('An .editorconfig file already exists in your workspace root.');
    //     }
    // });
}

