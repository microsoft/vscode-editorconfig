import * as vscode from 'vscode';
import * as editorconfig from 'editorconfig';
import * as fs from 'fs';

let editorConfig: EditorConfigService;

export function activate() {
    
    // hook into the "editor open" event and apply .editorconfig files on that document
    // i want this to apply for all open editors as well as any new editors, in case my extension 
    // is loaded while i have open files
    let editorConfig = new EditorConfigService();

    vscode.commands.registerCommand('vscode.editorconfig', editorConfig.startEditorConfig);

    // register a command handler to generatoe a .editorconfig file
    vscode.commands.registerCommand('vscode.generateeditorconfig', editorConfig.generateEditorConfig);
    
}


class EditorConfigService {

    public startEditorConfig = function() {
        vscode.shell.withEditors((e) => {
            e.onDocumentChange((e) => {
                const doc: vscode.Document = e.getDocument();
                let filepath: string;
                
                // make sure we have a document
                if (doc) {
                    filepath = doc.getUri().fsPath;
                    // ask editorconfig what the settings should be for this filename/type
                    editorconfig.parse(filepath).then((config) => {
                        // see if we found anything
                        if (Object.keys(config).length > 0) {
                           
                            // get current settings
                            vscode.Services.ConfigurationService.loadConfiguration('editor').then((value = {}) => {
                               
                                // convert editorsettings values to vscode editor options
                                let opts: vscode.EditorOptions = {
                                    useSpaces: config.indent_style ? (config.indent_style === 'tab' ? false : true) : value.insertSpaces,
                                    tabSize: value.indent_size ? value.indent_size : value.tabSize
                                };

                                vscode.shell.setStatusBarMessage('EditorConfig: ' + config.indent_style + ' ' + config.indent_size);

                                e.updateOptions(opts);
                            }, (reason) => {
                                console.log('editorConfig error: ' + reason);
                            });
                        };
                    });
                };
            });
        });
    }

    public generateEditorConfig = function() {
     
        // generate a .editorconfig file in the root of the workspace
        // based on the current editor settings and buffer properties
        
        // WANTS
        // cycle through all open *documents* and create a section for each type
        // pull editor settings directly, because i dont know what 'auto' actuall is
        // would like to open .editorconfig if created OR if one exists in workspace already

        let configFile: string = vscode.workspace.getPath();
        let opts: vscode.EditorOptions; 
        
        if (configFile === null) {
            vscode.shell.showInformationMessage("Please open a folder before generating an .editorconfig file");
            return;
        } else {
            configFile = configFile + '/.editorconfig';
        }

        vscode.Services.ConfigurationService.loadConfiguration('editor').then((value = {}) => {
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
            };
            
            if (value.tabSize === 'auto') {
                indent_size = '4';  // this is wrong!
            } else {
                indent_size = value.tabSize;
            };
            
            const fileContents = 
`root = true

[*]
indent_style = ${indent_style}
indent_size = ${indent_size}
`;

            fs.access(configFile, err => {
                if (err) {
                    fs.writeFile(configFile, fileContents, err => {
                        if (err) {
                            vscode.shell.showErrorMessage(err.toString());
                            return;
                        }
                    });
                } else {
                    vscode.shell.showInformationMessage('An .editorconfig file already exists in your workspace.');
                }
            });
        }, (reason) => {
            console.log('editorConfig error: ' + reason);            
        });
    }
}