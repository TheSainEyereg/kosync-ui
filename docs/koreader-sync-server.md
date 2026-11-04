# Original KOReader sync server and client

This document describes the original server and KOReader client from inspected
source code.

## Source revisions

Inspected on 2026-11-07:

- Server: [`46ef6b84a3930b3f0265efac74899f2256c158f1`](https://github.com/koreader/koreader-sync-server/tree/46ef6b84a3930b3f0265efac74899f2256c158f1).
- KOReader: [`ddfc91fd9cc75511b52374ac31617dda7f4f0e82`](https://github.com/koreader/koreader/tree/ddfc91fd9cc75511b52374ac31617dda7f4f0e82).

Links below pin the inspected revisions. Behavior may differ in other releases.

## Server repository structure

| Path | Responsibility |
| --- | --- |
| `Dockerfile` | Installs OpenResty, Gin, Lua dependencies, Redis, and runit; creates TLS credentials and supervised services. |
| `docker-compose.yml` | Publishes HTTPS and mounts application logs, Redis logs, and Redis data. |
| `Makefile` | Builds and starts the same combined container, creates host directories, and invokes tests. |
| `gin.patch` | Lets the Gin integration test runner select a request scheme. |
| `config/application.lua` | Application name `koreader` and version `1.0.1`. |
| `config/settings.lua` | Gin environments, ports, code caching, and API console settings. |
| `config/routes.lua` | Version 1 routes and registration enablement. |
| `config/errors.lua` | Application error codes, HTTP statuses, and messages. |
| `config/nginx.conf` | HTTP/HTTPS listeners, TLS settings, worker configuration, Gin initialization, and logs. |
| `config/redis.conf` | Network binding, database count, persistence, data directory, and Redis logs. |
| `db/redis.lua` | Environment-specific Redis connection settings and pooled connections. |
| `db/mysql.lua` | Unused database scaffold; the sync controller uses Redis. |
| `app/controllers/1/syncs_controller.lua` | Authentication, accounts, progress operations, and health check. |
| `scripts/healthcheck.sh` | Calls the HTTPS health endpoint with the versioned Accept header. |
| `scripts/run_tests.sh`, `spec/` | Upstream test runner and controller integration specifications. |

See the [server source tree](https://github.com/koreader/koreader-sync-server/tree/46ef6b84a3930b3f0265efac74899f2256c158f1).

## Original deployment and filesystem paths

The [Dockerfile](https://github.com/koreader/koreader-sync-server/blob/46ef6b84a3930b3f0265efac74899f2256c158f1/Dockerfile)
starts from Debian trixie, builds OpenResty 1.29.2.3, installs Gin and Lua
libraries, and installs Redis through apt without pinning its version. Runit
supervises both Redis and `gin start` in one container. `GIN_ENV=production` and
`ENABLE_USER_REGISTRATION=true` are image defaults.

| Container path | Purpose / upstream host mount |
| --- | --- |
| `/app/koreader-sync-server` | Server source and Gin working directory. |
| `/app/koreader-sync-server/config/redis.conf` | Redis configuration used by its supervised process. |
| `/app/koreader-sync-server/logs` | Gin/Nginx logs; mounted from `./logs/app`. |
| `/var/log/redis` | Redis logs; mounted from `./logs/redis`. |
| `/var/lib/redis` | Redis persistence; mounted from `./data/redis`. |
| `/etc/nginx/ssl/nginx.crt`, `/etc/nginx/ssl/nginx.key` | Self-signed certificate and private key generated during image build. |
| `/etc/service/redis-server/run` | Runit entry for Redis. |
| `/etc/service/koreader-sync-server/run` | Runit entry for Gin with Nginx kept in the foreground. |

In production, Nginx listens on HTTPS **7200** and HTTP **17200**. The latter is
produced by `listen 1{{GIN_PORT}}` and is intended for TLS-terminating reverse
proxies. The original Compose publishes only `7200:7200`. Development and test
Gin ports are 7202 and 7201 respectively.

The upstream health probe requests `https://127.0.0.1:7200/healthcheck` with
`Accept: application/vnd.koreader.v1+json` and checks for `{"state":"OK"}`.
The controller itself does not contact Redis in this action, so this is not a
Redis readiness check. See [Nginx configuration](https://github.com/koreader/koreader-sync-server/blob/46ef6b84a3930b3f0265efac74899f2256c158f1/config/nginx.conf)
and [health probe](https://github.com/koreader/koreader-sync-server/blob/46ef6b84a3930b3f0265efac74899f2256c158f1/scripts/healthcheck.sh).

## API requests and responses

The client sends JSON and `Accept: application/vnd.koreader.v1+json`. Protected
requests carry `x-auth-user` and `x-auth-key`; there is no session token exchange.
KOReader computes MD5 of the entered password and sends that derived value.
The server stores the supplied key as received and compares it directly.

| Method and path | Input / successful result |
| --- | --- |
| `POST /users/create` | JSON `username`, `password`; returns 201 with `{"username":"reader"}`. Uses SETNX so an existing account is not overwritten. |
| `GET /users/auth` | Auth headers; returns 200 with `{"authorized":"OK"}`. |
| `PUT /syncs/progress` | Auth headers and progress JSON; returns 200 with document identifier and server timestamp. |
| `GET /syncs/progress/:document` | Auth headers; returns 200 with stored progress or the empty result when no fields exist. |
| `GET /healthcheck` | Returns 200 with `{"state":"OK"}`. |
| `PUT /users/password` | Current auth headers and JSON `password` containing the replacement key; returns 200 with `{"updated":true}`. |
| `DELETE /users/me` | Auth headers; deletes account and user-prefixed keys; returns 200 with `{"deleted":true}`. |

Registration is enabled only when `ENABLE_USER_REGISTRATION` is `true` or `1`.
Usernames and document identifiers must be nonempty strings without colons.
Progress writes additionally require document identifiers matching
`[A-Za-z0-9_]+`, so written identifiers can be served by Gin's read route.

A typical KOReader upload with metadata enabled is:

```json
{
  "document": "0123456789abcdef0123456789abcdef",
  "progress": "/body/DocFragment[4]/body/p[12]/text().0",
  "percentage": 0.42,
  "device": "Example Reader",
  "device_id": "synthetic-device-id",
  "metadata": {
    "filename": "example.epub",
    "title": "Example Book",
    "authors": "Example Author"
  }
}
```

The server requires a number-convertible percentage and present progress/device
values; it does not enforce a 0–1 percentage range in the controller. Success
returns `{"document":"0123456789abcdef0123456789abcdef","timestamp":1794000000}`
with the actual server `os.time()` value. Reads convert percentage and timestamp
back to numbers and include `document` only if at least one stored field exists.
The empty read result is a Lua empty table; its exact JSON representation is a
Gin serialization concern and should be measured in HTTP tests rather than
inferred from Lua syntax.

Error bodies use `code` and `message`. The controller's error map is:

| Code | HTTP status | Meaning |
| --- | --- | --- |
| 1000 | 502 | Cannot connect to Redis. |
| 2000 | 502 | Internal operation failure. |
| 2001 | 401 | Invalid authentication. |
| 2002 | 402 | Username already registered. |
| 2003 | 403 | Invalid request fields. |
| 2004 | 403 | Missing or invalid document field. |
| 2005 | 402 | Registration disabled. |
| 2006 | 404 | Account absent during deletion, after orphan cleanup. |
| 2007 | 403 | Document identifier cannot be served by the read route. |

An absent-account deletion response is distinct from a generic 404. Password
replacement and progress writes recheck authentication atomically in Redis Lua
scripts. Account deletion atomically checks the key and removes the user prefix.

Sources: [routes](https://github.com/koreader/koreader-sync-server/blob/46ef6b84a3930b3f0265efac74899f2256c158f1/config/routes.lua),
[controller](https://github.com/koreader/koreader-sync-server/blob/46ef6b84a3930b3f0265efac74899f2256c158f1/app/controllers/1/syncs_controller.lua),
[errors](https://github.com/koreader/koreader-sync-server/blob/46ef6b84a3930b3f0265efac74899f2256c158f1/config/errors.lua).

## Redis layout and update semantics

`db/redis.lua` selects DB **1** for production, **2** for tests, and **3** for
development, all on `127.0.0.1:6379` in the original combined container. It uses
one connection pool per database, a one-second connection timeout, and returns
connections to their pool after controller actions.

| Redis key | Type | Contents |
| --- | --- | --- |
| `user:<username>:key` | String | Client-derived authentication key. |
| `user:<username>:document:<document>` | Hash | `percentage`, `progress`, `device`, optional `device_id`, and `timestamp`. |

The controller uses HSET on the document hash. It does not store JSON, use the
old separate `:percentage`/`:progress` string keys shown in the upstream README,
or retain a history. Each accepted write replaces the supplied fields and the
server timestamp. Repeated requests and earlier positions are accepted; the
server does not keep the maximum percentage. An omitted `device_id` leaves the
old field intact. There is no expiry set by these operations.

Deletion scans for every key beginning with `user:<username>:` and deletes it.
Extra metadata or session keys placed under that prefix would also be deleted.

The original configuration enables 5 databases, `dump.rdb`, snapshot schedules
`900 1`, `300 10`, and `60 10000`, plus AOF with `appendfsync everysec`.

Sources: [Redis connection module](https://github.com/koreader/koreader-sync-server/blob/46ef6b84a3930b3f0265efac74899f2256c158f1/db/redis.lua)
and [original Redis configuration](https://github.com/koreader/koreader-sync-server/blob/46ef6b84a3930b3f0265efac74899f2256c158f1/config/redis.conf).

## KOReader client structure and document identity

The plugin lives in `plugins/kosync.koplugin/`:

- `main.lua` owns settings, menus, document identity, metadata collection,
  synchronization decisions, and reader/network event handlers.
- `KOSyncClient.lua` builds Spore HTTP requests, installs JSON/auth/version
  middleware, and handles synchronous or asynchronous transport.
- `api.json` defines the default endpoint, routes, payloads, and expected statuses.
- `KOSyncQueue.lua` persists and retries failed uploads.

The default URL is `https://sync.koreader.rocks:443/`; a custom server URL replaces
it. Settings are saved in `<settings directory>/kosync.lua`, including username,
derived user key, custom URL, synchronization policies, and metadata preference.
The global reader settings provide the device ID. Uploads use a configured
KoSync hostname or `Device.model` as the device name.

By default, `document` comes from the document setting `partial_md5_checksum`.
`util.partialMD5` hashes sampled 1 KiB blocks rather than the complete file.
The alternative identity mode computes MD5 of the basename, including extension,
not the full path. Matching documents therefore need matching identity modes and
matching relevant content or filenames; hashes do not reveal a book title.

Paged documents supply a page number as progress; reflowable documents supply
an XPointer. `KOSyncClient` serializes progress with `tostring`. Percentage comes
from the appropriate paging/rolling reader module and is rounded by the plugin.
Applying remote progress dispatches `GotoPage` or `GotoXPointer` accordingly.

Sources: [plugin main](https://github.com/koreader/koreader/blob/ddfc91fd9cc75511b52374ac31617dda7f4f0e82/plugins/kosync.koplugin/main.lua),
[HTTP client](https://github.com/koreader/koreader/blob/ddfc91fd9cc75511b52374ac31617dda7f4f0e82/plugins/kosync.koplugin/KOSyncClient.lua),
[API specification](https://github.com/koreader/koreader/blob/ddfc91fd9cc75511b52374ac31617dda7f4f0e82/plugins/kosync.koplugin/api.json),
[partial hashing](https://github.com/koreader/koreader/blob/ddfc91fd9cc75511b52374ac31617dda7f4f0e82/frontend/util.lua),
[paging](https://github.com/koreader/koreader/blob/ddfc91fd9cc75511b52374ac31617dda7f4f0e82/frontend/apps/reader/modules/readerpaging.lua),
[rolling](https://github.com/koreader/koreader/blob/ddfc91fd9cc75511b52374ac31617dda7f4f0e82/frontend/apps/reader/modules/readerrolling.lua).

## Push, pull, and offline operation

Automatic sync defaults to off. With it enabled, opening a document pulls
progress; resume and network connection also initiate pulls. Suspend, document
close, and network disconnection trigger pushes. A page-count threshold can
schedule a push after ten idle seconds. Noninteractive pushes and pulls each
have a 25-second debounce; interactive actions bypass it.

On a pull, the client ignores missing progress, matching positions/percentages,
and progress identified as originating from the same model and device ID. A
manual pull applies the returned position without a further confirmation.
Automatic synchronization compares the server timestamp with the local last
page-turn timestamp. If the timestamp is missing, it compares percentage instead.
Forward/backward policies determine whether to prompt, apply silently, or do
nothing. Defaults are prompt for forward synchronization and disable for backward.
These decisions belong to the client; the server still accepts earlier positions.

Failed uploads except explicit HTTP 401 responses are queued. Closing a document
offline can queue progress directly. The queue is stored at
`<settings directory>/kosync_queue.lua`, keeps one item per document per UTC-style
86400-second day bucket, expires entries after four weeks, and caps storage at
200 entries. Items contain document, progress, percentage, device, device ID,
optional metadata, and local `queued_at`; they do not contain account credentials.
Retries use the currently configured credentials.

After a network connection, the plugin drains queued uploads before pulling.
Drain sends entries sequentially and stops at the first failure, removing
successfully sent entries while preserving replacements added during a request.
`queued_at` is not sent to the server. A delayed retry therefore receives a new
server timestamp and can overwrite a more recent position already stored there.
This follows from the queue payload and server's unconditional update semantics.

Sources: [event handlers and synchronization policies](https://github.com/koreader/koreader/blob/ddfc91fd9cc75511b52374ac31617dda7f4f0e82/plugins/kosync.koplugin/main.lua)
and [queue implementation](https://github.com/koreader/koreader/blob/ddfc91fd9cc75511b52374ac31617dda7f4f0e82/plugins/kosync.koplugin/KOSyncQueue.lua).

## Send Document Metadata

The inspected KOReader revision includes the **Send document metadata** menu
option. Its persisted setting is `send_metadata`, defaulting to `false`.
When disabled, `getMetadata()` returns no value and the optional metadata object
is omitted. Enabling it affects subsequent progress uploads; it does not invoke a
separate metadata endpoint or upload all books.

When enabled, `getMetadata()` constructs:

| JSON field | KOReader source | Meaning |
| --- | --- | --- |
| `metadata.filename` | `getFileName()` | Basename including extension, without the directory. |
| `metadata.title` | `self.ui.doc_props.display_title` | Display title, including user overrides and filename-derived fallback. |
| `metadata.authors` | `self.ui.doc_props.authors` | Author property, normally a string; multiple authors can be newline-separated. |

`ReaderUI` builds `doc_props` through `FileManagerBookInfo.extendProps`, which
merges custom properties with original properties and derives `display_title`
from the filename when the title is absent. Nil-valued Lua fields are absent;
a receiving server must allow missing metadata fields. The plugin does not
convert authors into a JSON array. It sends no cover, file contents, full path,
ISBN, series, or language through this metadata object.

`KOSyncClient:update_progress` puts the nested object directly into the existing
`PUT /syncs/progress` JSON payload. `api.json` declares `metadata` optional.
Failed/offline uploads capture the object in their queue entry, and retries send
that captured metadata, even if the metadata preference later changes.

The original server controller never reads `request.body.metadata`, never writes
it to Redis, and never returns it on progress reads. Thus this is a real KOReader
client feature for custom servers, not metadata persistence supplied by the
original server.

Sources: [metadata option and collection](https://github.com/koreader/koreader/blob/ddfc91fd9cc75511b52374ac31617dda7f4f0e82/plugins/kosync.koplugin/main.lua),
[payload transport](https://github.com/koreader/koreader/blob/ddfc91fd9cc75511b52374ac31617dda7f4f0e82/plugins/kosync.koplugin/KOSyncClient.lua),
[reader property initialization](https://github.com/koreader/koreader/blob/ddfc91fd9cc75511b52374ac31617dda7f4f0e82/frontend/apps/reader/readerui.lua),
[property overrides and display title](https://github.com/koreader/koreader/blob/ddfc91fd9cc75511b52374ac31617dda7f4f0e82/frontend/apps/filemanager/filemanagerbookinfo.lua),
[server progress controller](https://github.com/koreader/koreader-sync-server/blob/46ef6b84a3930b3f0265efac74899f2256c158f1/app/controllers/1/syncs_controller.lua).
