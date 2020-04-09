/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {ProtocolNotificationType} from './messages';
import {DocumentUri} from 'vscode-languageserver-types';
import {FileEvent} from './protocol';

/**
 * The file event type
 */
export namespace FileSystemChangeType {
	/**
	 * A significant update to the filesystem has begun (e.g. `git checkout master`).
	 * Language servers should consider suspending any background
	 * work that relies on a consistent view of the filesystem.
	 */
	export const UpdateBegin = 1;
	/**
	 * A significant update to the filesystem has ended (e.g. `git checkout master`).
	 * Language servers can safely recommence any background work
	 * that relies on a consistent view of the filesystem.
	 */
	export const UpdateEnd = 2;
}

export type FileSystemChangeType = 1 | 2;

/**
 * The watched file system notification is sent from the client to the server when
 * the client detects significant changes to a filesystem containing FileWatcher's
 * previously set up by the language server.
 */
export namespace DidChangeWatchedFileSystemNotification {
	export const type = new ProtocolNotificationType<DidChangeWatchedFileSystemParams, void>('workspace/didChangeWatchedFileSystem');
}

/**
 * An event describing a file change.
 */
export interface SequencedFileEvent {
	/**
	/**
	 * Conceptually a timestamp which allows events to
	 * be sorted and also compared and understood with
	 * regard to FileSystemEvents.
	 */
	sequence: number;
	/**
	 * The file event.
	 */
	event: FileEvent;
}

/**
 * An event describing a file change.
 */
export interface FileSystemEvent {
	/**
	 * Conceptually a timestamp which allows events to
	 * be sorted and also compared and understood with
	 * regard to FileEvents.
	 *
	 * A client should never send FileSystemEvents with
	 * anything other than increasing sequence numbers
	 * within a single session.
	 */
	sequence: number;
	/**
	 * The file system's root uri.
	 */
	uri: DocumentUri;
	/**
	 * The change type.
	 */
	type: FileSystemChangeType;

	/**
	 * Set when there are too many individual file changes
	 * to transmit, or the 'fileChangeThreshold' set by the
	 * server during configuration has been reached.
	 */
	allChanged?: boolean;

	/**
	 * In the case of a FileSystemChangeType.UpdateEnd
	 * this optional field will contain the batch of
	 * individual file changes that occurred (assuming
	 * they are within the threshold configured during
	 * at registration time)
	 */
	fileChanges?: SequencedFileEvent[]
}

/**
 * The watched files change notification's parameters.
 */
export interface DidChangeWatchedFileSystemParams {
	/**
	 * The actual file events.
	 */
	changes: FileSystemEvent[];
}
