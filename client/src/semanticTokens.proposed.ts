/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as vscode from 'vscode';
import { Middleware, BaseLanguageClient, TextDocumentFeature } from './client';
import { ClientCapabilities, ServerCapabilities, DocumentSelector, Proposed } from 'vscode-languageserver-protocol';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
	}
	return target[key];
}

export interface DocumentSemanticsTokensSignature {
	(this: void, document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SemanticTokens>
}

export interface DocumentSemanticsTokensEditsSignature {
	(this: void, document: vscode.TextDocument, previousResultId: string, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SemanticTokensEdits | vscode.SemanticTokens>
}

export interface DocumentRangeSemanticTokensSignature {
	(this: void, document: vscode.TextDocument, range: vscode.Range, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SemanticTokens>;
}

export interface SemanticTokensMiddleware {
	provideDocumentSemanticTokens?: (this: void, document: vscode.TextDocument, token: vscode.CancellationToken, next: DocumentSemanticsTokensSignature) => vscode.ProviderResult<vscode.SemanticTokens>;
	provideDocumentSemanticTokensEdits?: (this: void, document: vscode.TextDocument, previousResultId: string, token: vscode.CancellationToken, next: DocumentSemanticsTokensEditsSignature) => vscode.ProviderResult<vscode.SemanticTokensEdits | vscode.SemanticTokens>;
	provideDocumentRangeSemanticTokens?: (this: void, document: vscode.TextDocument, range: vscode.Range, token: vscode.CancellationToken, next: DocumentRangeSemanticTokensSignature) => vscode.ProviderResult<vscode.SemanticTokens>;
}

namespace protocol2code {
	export function asSemanticTokens(value: Proposed.SemanticTokens): vscode.SemanticTokens;
	export function asSemanticTokens(value: undefined | null): undefined;
	export function asSemanticTokens(value: Proposed.SemanticTokens | undefined | null): vscode.SemanticTokens | undefined;
	export function asSemanticTokens(value: Proposed.SemanticTokens | undefined | null): vscode.SemanticTokens | undefined {
		if (value === undefined || value === null) {
			return undefined;
		}
		return new vscode.SemanticTokens(new Uint32Array(value.data), value.resultId);
	}

	export function asSemanticTokensEdit(value: Proposed.SemanticTokensEdit): vscode.SemanticTokensEdit {
		return new vscode.SemanticTokensEdit(value.start, value.deleteCount, value.data !== undefined ? new Uint32Array(value.data) : undefined);
	}

	export function asSemanticTokensEdits(value: Proposed.SemanticTokensEdits): vscode.SemanticTokensEdits;
	export function asSemanticTokensEdits(value: undefined | null): undefined;
	export function asSemanticTokensEdits(value: Proposed.SemanticTokensEdits | undefined | null): vscode.SemanticTokensEdits | undefined;
	export function asSemanticTokensEdits(value: Proposed.SemanticTokensEdits | undefined | null): vscode.SemanticTokensEdits | undefined {
		if (value === undefined || value === null) {
			return undefined;
		}
		return new vscode.SemanticTokensEdits(value.edits.map(asSemanticTokensEdit), value.resultId);
	}

	export function asLegend(value: Proposed.SemanticTokensLegend): vscode.SemanticTokensLegend {
		return value;
	}
}

export interface SemanticTokensProviders {
	document: vscode.DocumentSemanticTokensProvider;
	range?: vscode.DocumentRangeSemanticTokensProvider;
}

export class SemanticTokensFeature extends TextDocumentFeature<boolean | Proposed.SemanticTokensOptions, Proposed.SemanticTokensRegistrationOptions, SemanticTokensProviders> {

	constructor(client: BaseLanguageClient) {
		super(client, Proposed.SemanticTokensRequest.type);
	}

	public fillClientCapabilities(cap: ClientCapabilities): void {
		const capabilites: ClientCapabilities & Proposed.SemanticTokensClientCapabilities = cap as any;
		let capability = ensure(ensure(capabilites, 'textDocument')!, 'semanticTokens')!;
		capability.dynamicRegistration = true;
		capability.tokenTypes = [
			Proposed.SemanticTokenTypes.comment,
			Proposed.SemanticTokenTypes.keyword,
			Proposed.SemanticTokenTypes.number,
			Proposed.SemanticTokenTypes.regexp,
			Proposed.SemanticTokenTypes.operator,
			Proposed.SemanticTokenTypes.namespace,
			Proposed.SemanticTokenTypes.type,
			Proposed.SemanticTokenTypes.struct,
			Proposed.SemanticTokenTypes.class,
			Proposed.SemanticTokenTypes.interface,
			Proposed.SemanticTokenTypes.enum,
			Proposed.SemanticTokenTypes.typeParameter,
			Proposed.SemanticTokenTypes.function,
			Proposed.SemanticTokenTypes.member,
			Proposed.SemanticTokenTypes.macro,
			Proposed.SemanticTokenTypes.variable,
			Proposed.SemanticTokenTypes.parameter,
			Proposed.SemanticTokenTypes.property,
			Proposed.SemanticTokenTypes.label
		];
		capability.tokenModifiers = [
			Proposed.SemanticTokenModifiers.declaration,
			Proposed.SemanticTokenModifiers.documentation,
			Proposed.SemanticTokenModifiers.static,
			Proposed.SemanticTokenModifiers.abstract,
			Proposed.SemanticTokenModifiers.deprecated,
			Proposed.SemanticTokenModifiers.readonly
		];
	}

	public initialize(cap: ServerCapabilities, documentSelector: DocumentSelector): void {
		const capabilities: ServerCapabilities & Proposed.SemanticTokensServerCapabilities = cap as any;
		let [id, options] = this.getRegistration(documentSelector, capabilities.semanticTokensProvider);
		if (!id || !options) {
			return;
		}
		this.register(this.messages, { id: id, registerOptions: options });
	}

	protected registerLanguageProvider(options: Proposed.SemanticTokensRegistrationOptions): [vscode.Disposable, SemanticTokensProviders] {
		const hasEditProvider = options.documentProvider !== undefined && typeof options.documentProvider !== 'boolean' && options.documentProvider.edits === true;
		const documentProvider: vscode.DocumentSemanticTokensProvider = {
			provideDocumentSemanticTokens: (document, token) => {
				const client = this._client;
				const middleware = client.clientOptions.middleware! as Middleware & SemanticTokensMiddleware;
				const provideDocumentSemanticTokens: DocumentSemanticsTokensSignature = (document, token) => {
					const params: Proposed.SemanticTokensParams =  {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document)
					};
					return client.sendRequest(Proposed.SemanticTokensRequest.type, params, token).then((result) => {
						return protocol2code.asSemanticTokens(result);
					}, (error: any) => {
						client.logFailedRequest(Proposed.SemanticTokensRequest.type, error);
						throw error;
					});
				};
				return middleware.provideDocumentSemanticTokens
					? middleware.provideDocumentSemanticTokens(document, token, provideDocumentSemanticTokens)
					: provideDocumentSemanticTokens(document, token);
			},
			provideDocumentSemanticTokensEdits: hasEditProvider
				? (document, previousResultId, token) => {
					const client = this._client;
					const middleware = client.clientOptions.middleware! as Middleware & SemanticTokensMiddleware;
					const provideDocumentSemanticTokensEdits: DocumentSemanticsTokensEditsSignature = (document, previousResultId, token) => {
						const params: Proposed.SemanticTokensEditsParams =  {
							textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
							previousResultId
						};
						return client.sendRequest(Proposed.SemanticTokensEditsRequest.type, params, token).then((result) => {
							if (Proposed.SemanticTokens.is(result)) {
								return protocol2code.asSemanticTokens(result);
							} else {
								return protocol2code.asSemanticTokensEdits(result);
							}
						}, (error: any) => {
							client.logFailedRequest(Proposed.SemanticTokensEditsRequest.type, error);
							throw error;
						});
					};
					return middleware.provideDocumentSemanticTokensEdits
						? middleware.provideDocumentSemanticTokensEdits(document, previousResultId, token, provideDocumentSemanticTokensEdits)
						: provideDocumentSemanticTokensEdits(document, previousResultId, token);
				}
				: undefined
		};
		const hasRangeProvider: boolean = options.rangeProvider === true;
		const rangeProvider: vscode.DocumentRangeSemanticTokensProvider | undefined = hasRangeProvider
			? {
				provideDocumentRangeSemanticTokens: (document: vscode.TextDocument, range: vscode.Range, token: vscode.CancellationToken) => {
					const client = this._client;
					const middleware = client.clientOptions.middleware! as Middleware & SemanticTokensMiddleware;
					const provideDocumentRangeSemanticTokens: DocumentRangeSemanticTokensSignature = (document, range, token) => {
						const params: Proposed.SemanticTokensRangeParams = {
							textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
							range: client.code2ProtocolConverter.asRange(range)
						};
						return client.sendRequest(Proposed.SemanticTokensRangeRequest.type, params, token).then((result) => {
							return protocol2code.asSemanticTokens(result);
						}, (error: any) => {
							client.logFailedRequest(Proposed.SemanticTokensRangeRequest.type, error);
							throw error;
						});
					};
					return middleware.provideDocumentRangeSemanticTokens
						? middleware.provideDocumentRangeSemanticTokens(document, range, token, provideDocumentRangeSemanticTokens)
						: provideDocumentRangeSemanticTokens(document, range, token);
				}
			}
			: undefined;

		const disposables: vscode.Disposable[] = [];
		const legend: vscode.SemanticTokensLegend = protocol2code.asLegend(options.legend);
		disposables.push(vscode.languages.registerDocumentSemanticTokensProvider(options.documentSelector!, documentProvider, legend));
		if (rangeProvider !== undefined) {
			disposables.push(vscode.languages.registerDocumentRangeSemanticTokensProvider(options.documentSelector!, rangeProvider, legend));
		}

		return [new vscode.Disposable(() => disposables.forEach(item => item.dispose())), { document: documentProvider, range: rangeProvider }];
	}
}