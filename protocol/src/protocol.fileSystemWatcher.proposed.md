
#### File System Watching

A server can determine whether the client supports the FileSystemWatcher capabilities
by inspecting the following component of the ClientCapabilities interface.

_Client Capabilities_:

```ts
FileSystemWatcherClientCapabilities {
    /**
     * FileSystemWatcher notification supports dynamic registration. Please note
     * that the current protocol doesn't support static configuration for file system
     * changes from the server side.
     */
    dynamicRegistration?: boolean;
}
```

_Registration Options_:

This proposal modifies the existing DidChangeWatchedFilesRegistrationOptions with the elements marked with `[new]`.

```ts
/**
 * Describe options to be used when registered for text document change events.
 */
export interface DidChangeWatchedFilesRegistrationOptions {
    /**
     * The watchers to register.
     */
    watchers: FileSystemWatcher[];

    /**
     * [new]
     * Whether to also receive didChangeWatchedFileSystem events
     * for the filesystems affected by this registration.
     *
     * If not supplied, defaults to false.
     */
    watchFileSystem?: boolean;
    /**
     * [new]
     * The threshold of how many file change events to squeeze into a
     * FileSystemChange notification before the 'reloadAll' flag would be set.
     *
     * A value of -1 means "no threshold" (beyond any imposed by the client
     * for sanity/stability reasons).
     *
  * If not supplied, defaults to -1.
     */
    fileChangeThreshold?: number;
}
```

##### FileSystemWatcher Notification

_Notification_:

The `workspace/didChangeWatchedFileSystem` request is sent from the client to the server to indicate a significant change occurred to the filesystem.

Returns a collection of calls from one symbol to another.

* method: ‘workspace/didChangeWatchedFileSystem'
* params: `DidChangeWatchedFileSystemParams` defined as follows:

```ts
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
```
