import * as assert from 'assert';
import * as vscode from 'vscode';
import {Utils} from '../editorConfigMain';

suite(".editorconfig extension", () => {

	// Defines a Mocha unit test
	test("Utils.fromEditorConfig", () => {
		assert.deepEqual(Utils.fromEditorConfig({ indent_style: 'tab', indent_size: 5 }, false, 4), { insertSpaces: false, tabSize: 5 });
		assert.deepEqual(Utils.fromEditorConfig({ indent_style: 'space', indent_size: 5 }, false, 4), { insertSpaces: true, tabSize: 5 });
		assert.deepEqual(Utils.fromEditorConfig({ indent_size: 5 }, false, 4), { insertSpaces: false, tabSize: 5 });
		assert.deepEqual(Utils.fromEditorConfig({ indent_size: 5 }, true, 4), { insertSpaces: true, tabSize: 5 });
		assert.deepEqual(Utils.fromEditorConfig({ indent_style: 'space' }, false, 4), { insertSpaces: true, tabSize: 4 });
		assert.deepEqual(Utils.fromEditorConfig({ indent_style: 'space' }, false, 5), { insertSpaces: true, tabSize: 5 });
		assert.deepEqual(Utils.fromEditorConfig({ }, false, 5), { insertSpaces: false, tabSize: 5 });
		assert.deepEqual(Utils.fromEditorConfig({ }, true, 4), { insertSpaces: true, tabSize: 4 });
	});

	test("Utils.toEditorConfig", () => {
		assert.deepEqual(Utils.toEditorConfig(true, 5), { indent_style: 'space', indent_size: 5 });
		assert.deepEqual(Utils.toEditorConfig(false, 6), { indent_style: 'tab', indent_size: 6 });
		assert.deepEqual(Utils.toEditorConfig(false, 'auto'), { indent_style: 'tab', indent_size: 4 });
		assert.deepEqual(Utils.toEditorConfig('auto', 7), { indent_style: 'tab', indent_size: 7 });
		assert.deepEqual(Utils.toEditorConfig('auto', 'auto'), { indent_style: 'tab', indent_size: 4 });
	});
});