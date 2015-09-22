// 'use strict';

// import vscode = require('vscode');

// // import parser = require('./parser');
// // import hub = require('./hubAPI');

// function isEditorConfig(resource:vscode.Uri): boolean {
// 	return /\.editorconfig/.test(resource.toString());
// }

// export class SuggestSupport implements vscode.Modes.ISuggestSupport {

// 	public triggerCharacters:string[] = [];
// 	public excludeTokens:string[] = [];

// 	private _modelService: vscode.Services.IModelService;

// 	constructor(modelService: vscode.Services.IModelService) {
// 		this._modelService = modelService;
// 	}

// 	public suggest(resource:vscode.Uri, position:vscode.IPosition): Promise<vscode.Modes.ISuggestions[]> {
// 		if (!isEditorConfig(resource)) {
// 			return Promise.resolve(null);
// 		}
// 		var model = this._modelService.getModel(resource);

// 		var line = model.getValueInRange({
// 			startLineNumber: position.lineNumber,
// 			startColumn: 1,
// 			endLineNumber: position.lineNumber,
// 			endColumn: model.getLineMaxColumn(position.lineNumber)
// 		});

// 		if (line.length === 0) {
// 			// empty line
// 			return Promise.resolve([this._suggestKeys('')]);
// 		}

// 		var word = model.getWordAtPosition(position);

// 		var textBefore = line.substring(0, position.column - 1);

// 		if (/^\s*[\w_]*$/.test(textBefore)) {
// 			// on the first token
// 			return Promise.resolve([this._suggestKeys(word ? word.word : '')]);
// 		}

// 		var imageTextWithQuoteMatch = textBefore.match(/^\s*image\s*\:\s*"([^"]*)$/);
// 		if (imageTextWithQuoteMatch) {
// 			var imageText = imageTextWithQuoteMatch[1];
// 			return this._suggestImages(imageText, true);
// 		}

// 		var imageTextWithoutQuoteMatch = textBefore.match(/^\s*image\s*\:\s*([\w\:\/]*)/);
// 		if (imageTextWithoutQuoteMatch) {
// 			var imageText = imageTextWithoutQuoteMatch[1];
// 			return this._suggestImages(imageText, false);
// 		}

// 		return Promise.resolve([]);
// 	}

// 	private _suggestImages(word:string, hasLeadingQuote:boolean): Promise<vscode.Modes.ISuggestions[]> {
// 		return this._suggestHubImages(word).then((results) => {
// 			return [{
// 				incomplete: true,
// 				currentWord: (hasLeadingQuote ? '"' + word : word),
// 				suggestions: results
// 			}]
// 		});
// 	}

// 	private _suggestHubImages(word:string): Promise<vscode.Modes.ISuggestion[]> {
// 		return hub.searchImagesInRegistryHub(word, true).then((results) => {
// 			return results.map((image) => {
// 				var stars = '';
// 				if (image.star_count > 0) {
// 					stars = ' ' + image.star_count + ' ' + (image.star_count > 1 ? 'stars' : 'star');
// 				}
// 				return {
// 					label: image.name,
// 					codeSnippet: '"' + image.name + '"',
// 					type: 'value',
// 					documentationLabel: image.description,
// 					typeLabel: hub.tagsForImage(image) + stars
// 				}
// 			});
// 		});
// 	}

// 	private _suggestKeys(word:string): vscode.Modes.ISuggestions {
// 		return {
// 			currentWord: word,
// 			suggestions: Object.keys(parser.RAW_KEY_INFO).map((ruleName) => {
// 				return {
// 					label: ruleName,
// 					codeSnippet: ruleName + ': ',
// 					type: 'property',
// 					documentationLabel: parser.RAW_KEY_INFO[ruleName]
// 				}
// 			})
// 		};
// 	}
// }