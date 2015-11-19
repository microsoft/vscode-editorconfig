import * as assert from 'assert';
import * as vscode from 'vscode';
import {Utils} from '../src/editorConfigMain';

suite('.editorconfig extension', () => {

	// Defines a Mocha unit test
	test('Utils.fromEditorConfig', () => {
		[
			{
				config: {
					indent_style: 'tab',
					indent_size: 5
				},
				defaults: {
					insertSpaces: false,
					tabSize: 4
				},
				expected: {
					insertSpaces: false,
					tabSize: 5
				}
			},
			{
				config: {
					indent_style: 'space',
					indent_size: 5
				},
				defaults: {
					insertSpaces: false,
					tabSize: 4
				},
				expected: {
					insertSpaces: true,
					tabSize: 5
				}
			},
			{
				config: {
					indent_size: 5
				},
				defaults: {
					insertSpaces: false,
					tabSize: 4
				},
				expected: {
					insertSpaces: false,
					tabSize: 5
				}
			},
			{
				config: {
					indent_size: 5
				},
				defaults: {
					insertSpaces: true,
					tabSize: 4
				},
				expected: {
					insertSpaces: true,
					tabSize: 5
				}
			},
			{
				config: {
					indent_style: 'space'
				},
				defaults: {
					insertSpaces: false,
					tabSize: 4
				},
				expected: {
					insertSpaces: true,
					tabSize: 4
				}
			},
			{
				config: {
					indent_style: 'space'
				},
				defaults: {
					insertSpaces: false,
					tabSize: 5
				},
				expected: {
					insertSpaces: true,
					tabSize: 5
				}
			},
			{
				config: {},
				defaults: {
					insertSpaces: false,
					tabSize: 5
				},
				expected: {
					insertSpaces: false,
					tabSize: 5
				}
			},
			{
				config: {},
				defaults: {
					insertSpaces: true,
					tabSize: 4
				},
				expected: {
					insertSpaces: true,
					tabSize: 4
				}
			}
		].forEach(({ config, defaults, expected }) => {
			assert.deepEqual(Utils.fromEditorConfig.call(this, config, defaults), expected);
		});
	});

	test('Utils.toEditorConfig', () => {
		[
			{
				options: {
					insertSpaces: true,
					tabSize: 5
				},
				expected: {
					indent_style: 'space',
					indent_size: 5
				}
			},
			{
				options: {
					insertSpaces: false,
					tabSize: 6
				},
				expected: {
					indent_style: 'tab',
					indent_size: 6
				}
			},
			{
				options: {
					insertSpaces: false,
					tabSize: 'auto'
				},
				expected: {
					indent_style: 'tab',
					indent_size: 4
				}
			},
			{
				options: {
					insertSpaces: 'auto',
					tabSize: 7
				},
				expected: {
					indent_style: 'tab',
					indent_size: 7
				}
			},
			{
				options: {
					insertSpaces: 'auto',
					tabSize: 'auto'
				},
				expected: {
					indent_style: 'tab',
					indent_size: 4
				}
			}
		].forEach(({ options, expected }) => {
			assert.deepEqual(Utils.toEditorConfig.call(this, options), expected);
		});
	});
});