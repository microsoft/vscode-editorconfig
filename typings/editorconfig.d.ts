declare module 'editorconfig' {

    export interface knownProps {
        end_of_line?: string,
        indent_style?: string,
        indent_size?: any,
        insert_final_newline?: boolean,
        trim_trailing_whitespace?: boolean,
        charset?: string
    }

    export interface options {config:string, version: string, root:string}

    export function parse(filepath:string, options?:options): any;
}